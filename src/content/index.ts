/**
 * Content script. Runs in every frame; only the top frame talks to the side panel.
 *
 * Responsibilities:
 *   - pick mode: hover outline, click capture, suppressing the page's own handlers
 *   - turning a picked element into a ranked PickResult
 *   - relaying mode changes down the frame tree and picks back up it
 *
 * Injected on demand via chrome.scripting (see background/index.ts), so it is
 * absent from pages the user never points it at. `__pspLoaded` guards against the
 * double-injection that happens when the user re-opens the panel.
 */
import { setTestIdAttribute, testIdAttribute } from '../engine/bootstrap.js';
import { candidatesFor, detectRetarget } from '../engine/generate.js';
import { inspect } from '../engine/inspect.js';
import { evaluateLocal } from '../engine/query.js';
import { parseLocatorInput } from '../core/locatorInput.js';
import { COLLECTION_BUDGET_MS, collectFromChild, runEvaluation } from './evaluate.js';
import {
  afterPaint,
  handleMeasureRequest,
  handleMeasureResult,
  measurePick,
  setPickedElement,
} from './capture.js';
import { rank } from '../core/rank.js';
import { toAxisSelectors } from '../core/axisSelectors.js';
import { toCssPath, toXPath } from '../core/rawSelectors.js';
import * as overlay from './overlay.js';
import { addHopForSource, broadcastDown, bubbleUp, isTopFrame, readFrameMessage } from './frames.js';
import type { ContentToPanel, PanelToContent } from '../shared/messages.js';
import type {
  CaptureStart,
  CaptureTarget,
  EvaluationResult,
  FrameEvaluation,
  PickResult,
} from '../shared/types.js';

declare global {
  interface Window {
    __pspLoaded?: boolean;
  }
}

if (!window.__pspLoaded) {
  window.__pspLoaded = true;
  start();
}

function start(): void {
  let mode: 'idle' | 'pick' = 'idle';
  let hovered: Element | null = null;

  // ---------------------------------------------------------------- pick mode

  function setMode(next: 'idle' | 'pick', propagate = true): void {
    if (mode === next) return;
    mode = next;
    hovered = null;
    overlay.clear();

    if (next === 'pick') {
      // Starting a new pick invalidates the old one. setMode runs in every frame,
      // so afterwards at most one frame holds an element for a screenshot to find.
      setPickedElement(null);
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('scroll', onViewportChange, true);
      window.addEventListener('resize', onViewportChange, true);
    } else {
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange, true);
    }

    if (propagate) broadcastDown({ __psp: true, type: 'PSP_FRAME_SET_MODE', mode: next });
  }

  function onMouseMove(event: MouseEvent): void {
    const element = event.target;
    if (!(element instanceof Element) || element === hovered) return;
    hovered = element;

    const info = inspect(element);
    const caption = info.role
      ? `${info.role}${info.accessibleName ? ` "${info.accessibleName}"` : ''}`
      : `<${info.tagName}>`;
    overlay.showHover(element, caption);
  }

  /**
   * Capture phase + full suppression: the click must never reach the page, or
   * picking a submit button would navigate away from the thing being inspected.
   */
  function onClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Hold the element itself, not its rect: a screenshot re-measures later, by
    // which time the page may well have moved underneath it.
    setPickedElement(event.target);
    report(buildResult(event.target));
    setMode('idle');
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setMode('idle');
    if (isTopFrame()) notifyPanel({ type: 'PSP_MODE_CHANGED', mode: 'idle' });
  }

  /** Boxes are positioned in viewport coordinates, so they must follow the view. */
  function onViewportChange(): void {
    if (mode === 'pick' && hovered?.isConnected) {
      const info = inspect(hovered);
      const caption = info.role ? `${info.role} "${info.accessibleName}"` : `<${info.tagName}>`;
      overlay.showHover(hovered, caption);
    }
  }

  // ------------------------------------------------------------------ picking

  function buildResult(element: Element): PickResult {
    const candidates = rank(candidatesFor(element));
    const best = candidates[0];
    const retarget = best ? detectRetarget(element, best.selector) : null;

    return {
      candidates,
      info: inspect(element),
      raw: {
        css: toCssPath(element),
        xpath: toXPath(element),
        ...toAxisSelectors(element, testIdAttribute()),
      },
      frameChain: [],
      ...(retarget ? { retarget } : {}),
    };
  }

  /** Top frame reports to the panel; child frames bubble to their parent. */
  function report(result: PickResult): void {
    if (isTopFrame()) notifyPanel({ type: 'PSP_PICKED', result });
    else bubbleUp(result);
  }

  function notifyPanel(message: ContentToPanel): void {
    // The panel may be closed; a rejected sendMessage is expected, not an error.
    void chrome.runtime.sendMessage(message).catch(() => {});
  }

  // -------------------------------------------------- cross-frame evaluation

  let requestCounter = 0;

  function clearHighlightEverywhere(): void {
    overlay.clear();
    broadcastDown({ __psp: true, type: 'PSP_FRAME_CLEAR_HIGHLIGHT' });
  }

  /**
   * Run the user's input against every frame and assemble one answer.
   *
   * The frame the expression addresses is authoritative — that count is what a
   * real Playwright run would see. Matches in other frames are reported
   * separately with the prefix that would be needed to reach them, never summed
   * into a single total that no test could reproduce.
   */
  function evaluateAcrossFrames(
    input: string,
    options: { highlight?: boolean } = {},
  ): Promise<EvaluationResult> {
    const parsed = parseLocatorInput(input, testIdAttribute());

    if (!parsed.ok) {
      if (options.highlight) clearHighlightEverywhere();
      return Promise.resolve({
        input,
        selector: null,
        error: parsed.error,
        target: null,
        otherFrames: [],
        strictViolation: false,
        unreachableFrames: 0,
      });
    }

    const { frameSelectors, selector } = parsed.value;
    const requestId = `psp-${++requestCounter}`;

    return new Promise((resolve) => {
      runEvaluation(
        {
          __psp: true,
          type: 'PSP_FRAME_EVALUATE',
          requestId,
          selector,
          remainingHops: frameSelectors,
          onPath: true,
          deadline: Date.now() + COLLECTION_BUDGET_MS,
          highlight: options.highlight === true,
        },
        ({ entries, unreachable }) => {
          const target = entries.find((entry) => entry.isTarget) ?? null;
          const otherFrames = entries.filter((entry) => entry !== target && entry.matchCount > 0);

          resolve({
            input,
            selector,
            // A selector the engine rejected outranks "no matches" as an
            // explanation, and an unreachable frame outranks both.
            error: target === null ? unreachableFrameError(frameSelectors) : target.error,
            target,
            otherFrames,
            strictViolation: (target?.matchCount ?? 0) > 1,
            unreachableFrames: unreachable,
          });
        },
      );
    });
  }

  /** The addressed frame never reported — almost always a bad frameLocator hop. */
  function unreachableFrameError(frameSelectors: string[]): string {
    if (frameSelectors.length === 0) return 'Could not evaluate in the main frame.';
    return `frameLocator(${JSON.stringify(frameSelectors[0])}) did not match exactly one frame.`;
  }

  // ------------------------------------------------------------- screenshots

  /**
   * How long the overlay may stay hidden without anyone asking for it back.
   *
   * PSP_CAPTURE_END normally restores it within a few hundred milliseconds, but
   * the panel can be closed mid-capture. Leaving a page permanently unable to
   * show highlights would be a far worse bug than a screenshot with a box in it.
   */
  const CAPTURE_RESTORE_MS = 4000;
  let restoreTimer = 0;

  function suppressOverlays(suppressed: boolean): void {
    overlay.setSuppressed(suppressed);
    broadcastDown({ __psp: true, type: 'PSP_FRAME_OVERLAY_SUPPRESSED', suppressed });
  }

  async function beginCapture(target: CaptureTarget, highlight: boolean): Promise<CaptureStart> {
    suppressOverlays(true);
    window.clearTimeout(restoreTimer);
    restoreTimer = window.setTimeout(() => suppressOverlays(false), CAPTURE_RESTORE_MS);

    if (target === 'element') {
      const rect = await measurePick({ scroll: true });
      if (!rect) {
        endCapture();
        return {
          ok: false,
          error: 'The picked element is not on the page any more. Pick it again.',
        };
      }
      // measurePick has already waited out its own scroll; this one is for the
      // overlay going dark, which may have happened in the very same frame.
      await afterPaint();
      return { ok: true, geometry: { rect, viewport: viewportSize() } };
    }

    await afterPaint();
    // Measured where the element already is. Scrolling to it would move the very
    // viewport the user asked for a picture of — if it is off-screen, the honest
    // answer is a shot with no box on it.
    const marked = highlight ? await measurePick({ scroll: false }) : null;
    const viewport = viewportSize();

    return {
      ok: true,
      geometry: { rect: { x: 0, y: 0, ...viewport }, viewport, highlight: marked },
    };
  }

  function endCapture(): void {
    window.clearTimeout(restoreTimer);
    suppressOverlays(false);
  }

  /**
   * innerWidth, not documentElement.clientWidth: the classic scrollbar is inside
   * the one and outside the other, and captureVisibleTab photographs it. Matching
   * what the camera sees is what keeps the scale honest.
   */
  function viewportSize(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  // ------------------------------------------------------- cross-frame wiring

  window.addEventListener('message', (event) => {
    const message = readFrameMessage(event);
    if (!message) return;

    switch (message.type) {
      case 'PSP_FRAME_SET_MODE':
        setMode(message.mode);
        return;

      case 'PSP_FRAME_CLEAR_HIGHLIGHT':
        overlay.clear();
        broadcastDown(message);
        return;

      case 'PSP_FRAME_OVERLAY_SUPPRESSED':
        overlay.setSuppressed(message.suppressed);
        broadcastDown(message);
        return;

      case 'PSP_FRAME_MEASURE_PICK':
        handleMeasureRequest(message.requestId, message.scroll);
        return;

      case 'PSP_FRAME_MEASURE_PICK_RESULT':
        handleMeasureResult(message.requestId, event.source, message.rect);
        return;

      // A child finished a pick. Add our hop and keep it moving upward.
      case 'PSP_FRAME_BUBBLE':
        setMode('idle', false);
        report(addHopForSource(event, message.result));
        return;

      // Only sub-frames answer upward; the top frame resolves to the panel instead.
      case 'PSP_FRAME_EVALUATE':
        runEvaluation(message, ({ entries, unreachable }) => {
          if (isTopFrame()) return;
          window.parent.postMessage(
            {
              __psp: true,
              type: 'PSP_FRAME_EVALUATE_RESULT',
              requestId: message.requestId,
              entries,
              unreachable,
            },
            '*',
          );
        });
        return;

      case 'PSP_FRAME_EVALUATE_RESULT':
        collectFromChild(message.requestId, event.source, message.entries, message.unreachable);
        return;
    }
  });

  // ------------------------------------------------------ side panel protocol

  if (!isTopFrame()) return;

  chrome.runtime.onMessage.addListener((message: PanelToContent, _sender, sendResponse) => {
    switch (message.type) {
      case 'PSP_PING':
        sendResponse({ ok: true, url: location.href });
        return false;

      case 'PSP_SET_MODE':
        setMode(message.mode);
        sendResponse({ ok: true });
        return false;

      case 'PSP_SETTINGS':
        setTestIdAttribute(message.settings.testIdAttributeName);
        sendResponse({ ok: true });
        return false;

      case 'PSP_EVALUATE':
        evaluateAcrossFrames(message.selector).then(sendResponse);
        return true; // async response

      case 'PSP_HIGHLIGHT':
        // Same fan-out as evaluation, results discarded — each frame paints its
        // own matches, so a selector is highlighted wherever it resolves.
        if (message.selector === null) clearHighlightEverywhere();
        else void evaluateAcrossFrames(message.selector, { highlight: true });
        sendResponse({ ok: true });
        return false;

      case 'PSP_CAPTURE_BEGIN':
        beginCapture(message.target, message.highlight).then(sendResponse);
        return true; // async response

      case 'PSP_CAPTURE_END':
        endCapture();
        sendResponse({ ok: true });
        return false;

      default:
        return false;
    }
  });
}
