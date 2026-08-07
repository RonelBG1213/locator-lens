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
import { setTestIdAttribute } from '../engine/bootstrap.js';
import { candidatesFor, detectRetarget } from '../engine/generate.js';
import { inspect } from '../engine/inspect.js';
import { evaluate, queryAll } from '../engine/query.js';
import { rank } from '../core/rank.js';
import { toCssPath, toXPath } from '../core/rawSelectors.js';
import * as overlay from './overlay.js';
import { addHopForSource, broadcastDown, bubbleUp, isTopFrame, readFrameMessage } from './frames.js';
import type { ContentToPanel, PanelToContent } from '../shared/messages.js';
import type { PickResult } from '../shared/types.js';

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
      raw: { css: toCssPath(element), xpath: toXPath(element) },
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

  // ------------------------------------------------------- cross-frame wiring

  window.addEventListener('message', (event) => {
    const message = readFrameMessage(event);
    if (!message) return;

    if (message.type === 'PSP_FRAME_SET_MODE') {
      setMode(message.mode);
      return;
    }

    // A child finished a pick. Add our hop and keep it moving upward.
    if (message.type === 'PSP_FRAME_BUBBLE') {
      setMode('idle', false);
      report(addHopForSource(event, message.result));
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
        sendResponse(evaluate(message.selector));
        return false;

      case 'PSP_HIGHLIGHT':
        if (message.selector === null) overlay.clear();
        else {
          try {
            overlay.showMatches(queryAll(message.selector));
          } catch {
            overlay.clear();
          }
        }
        sendResponse({ ok: true });
        return false;

      default:
        return false;
    }
  });
}
