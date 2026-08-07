/**
 * Locating the picked element for a screenshot.
 *
 * The panel can photograph the visible tab but has no idea where the element is:
 * the pick may have happened three frames deep, and between picking and asking
 * for a screenshot the user may have scrolled, resized, or watched the page
 * reflow. So the rect is measured fresh, in the page, at the moment of capture —
 * never remembered from pick time.
 *
 * Exactly one frame holds the pick (entering pick mode clears it everywhere), so
 * this needs none of evaluate.ts's collect-every-answer machinery. The request is
 * broadcast down the tree; the one frame that still has the element scrolls it
 * into view, measures it, and posts the rect to its parent; each parent on the
 * way up adds its own iframe offset. Frames with nothing to say stay silent, and
 * silence until the deadline is the answer: the element is gone.
 */
import { broadcastDown, findFrameElement, frameContentOffset, isTopFrame } from './frames.js';
import type { Rect } from '../shared/types.js';

/** Enough for a scroll plus a couple of frames of paint, even a few frames deep. */
export const MEASURE_BUDGET_MS = 600;

interface PendingMeasure {
  deliver: (rect: Rect | null) => void;
  timer: number;
}

/** Only ever populated in the frame that started the request — the top one. */
const pending = new Map<string, PendingMeasure>();
let requestCounter = 0;

/** The element this frame last had picked. Null in every other frame. */
let picked: Element | null = null;

/**
 * Remember (or forget) this frame's pick. Called with null on entering pick mode,
 * which propagates to every frame and guarantees at most one holder afterwards.
 */
export function setPickedElement(element: Element | null): void {
  picked = element;
}

/** Top frame: ask the tree where the picked element is. Null when nobody answers. */
export function measurePick(options: { scroll: boolean }): Promise<Rect | null> {
  const requestId = `psp-shot-${++requestCounter}`;

  return new Promise((resolve) => {
    pending.set(requestId, {
      deliver: resolve,
      timer: window.setTimeout(() => settle(requestId, null), MEASURE_BUDGET_MS),
    });

    broadcastDown({
      __psp: true,
      type: 'PSP_FRAME_MEASURE_PICK',
      requestId,
      scroll: options.scroll,
    });
    // The top frame may be holding the pick itself.
    void measureLocal(options.scroll).then((rect) => {
      if (rect) settle(requestId, rect);
    });
  });
}

/** Any sub-frame: relay the request onward, and answer if the pick is ours. */
export function handleMeasureRequest(requestId: string, scroll: boolean): void {
  broadcastDown({ __psp: true, type: 'PSP_FRAME_MEASURE_PICK', requestId, scroll });

  void measureLocal(scroll).then((rect) => {
    if (!rect || isTopFrame()) return;
    reportUp(requestId, rect);
  });
}

/**
 * A descendant answered. Translate the rect out of the child's viewport and into
 * ours, then either resolve (we started this) or keep it moving upward.
 */
export function handleMeasureResult(
  requestId: string,
  source: MessageEventSource | null,
  rect: Rect,
): void {
  const frame = findFrameElement(source);
  if (!frame) return;

  const offset = frameContentOffset(frame);
  const translated: Rect = { ...rect, x: rect.x + offset.x, y: rect.y + offset.y };

  if (pending.has(requestId)) settle(requestId, translated);
  else if (!isTopFrame()) reportUp(requestId, translated);
}

/**
 * Wait for the browser to lay out and paint. Two frames, not one: the first lets
 * a scroll or a style change apply, the second lets it reach the screen — and the
 * screen is what captureVisibleTab reads.
 */
export function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Measure this frame's pick, in this frame's coordinates. Optionally scroll to it first. */
async function measureLocal(scroll: boolean): Promise<Rect | null> {
  const element = picked;
  if (!element?.isConnected) return null;

  if (scroll) {
    // Chrome propagates scrollIntoView across frame boundaries even cross-origin,
    // so this also brings every ancestor frame into view. 'instant' because a
    // smooth scroll would still be moving when the shutter opens.
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    await afterPaint();
  }

  if (!element.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

function reportUp(requestId: string, rect: Rect): void {
  window.parent.postMessage(
    { __psp: true, type: 'PSP_FRAME_MEASURE_PICK_RESULT', requestId, rect },
    '*',
  );
}

/** First answer wins; the deadline supplies a null one if nothing else does. */
function settle(requestId: string, rect: Rect | null): void {
  const entry = pending.get(requestId);
  if (!entry) return;
  pending.delete(requestId);
  window.clearTimeout(entry.timer);
  entry.deliver(rect);
}
