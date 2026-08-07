/**
 * Cross-frame selector evaluation.
 *
 * A Playwright selector cannot cross a frame boundary in one query, so the
 * editor's "how many matches?" question has to be asked of every frame
 * separately and the answers reassembled.
 *
 * One downward pass does both jobs at once:
 *
 *   - every frame evaluates the selector against its own document (discovery)
 *   - each parent checks whether a child is the next `frameLocator()` hop the
 *     user typed, and passes an `onPath` flag down (addressing)
 *
 * A frame is THE target when it is still on the addressed path and no hops
 * remain. Results bubble back up, each parent prepending its own hop, so every
 * entry arrives at the top carrying the full prefix needed to reach it.
 *
 * Frames that never answer are counted, not waited on: the walk runs against an
 * absolute deadline carried in the message, so one wedged iframe cannot hang the
 * editor.
 */
import { evaluateLocal, resolveFrameElement } from '../engine/query.js';
import * as overlay from './overlay.js';
import { childFrames, hopForFrame, findFrameElement, sendToFrame } from './frames.js';
import type { FrameMessage } from '../shared/messages.js';
import type { FrameEvaluation } from '../shared/types.js';

/** How long the whole tree gets to answer. Comfortably under the editor's feel. */
export const COLLECTION_BUDGET_MS = 350;

/** What a frame reports upward once its whole subtree has answered. */
export interface Collected {
  entries: FrameEvaluation[];
  /** Frames in this subtree that missed the deadline. */
  unreachable: number;
}

interface Pending {
  /** Child frames we are still waiting on, keyed by the frame element. */
  outstanding: Set<HTMLIFrameElement>;
  entries: FrameEvaluation[];
  /** Unreachable frames reported by descendants that did answer. */
  unreachable: number;
  timer: number;
  finish: (collected: Collected) => void;
}

const pending = new Map<string, Pending>();

/**
 * Handle a downward PSP_FRAME_EVALUATE: evaluate locally, forward to children,
 * and resolve once every child has answered or the deadline passes.
 */
export function runEvaluation(
  message: Extract<FrameMessage, { type: 'PSP_FRAME_EVALUATE' }>,
  report: (collected: Collected) => void,
): void {
  const { requestId, selector, remainingHops, onPath, deadline, highlight } = message;

  const local = evaluateLocal(selector);
  if (highlight) {
    if (local.elements.length > 0) overlay.showMatches(local.elements);
    else overlay.clear();
  }

  const own: FrameEvaluation = {
    frameChain: [],
    matchCount: local.elements.length,
    previews: local.previews,
    isTarget: onPath && remainingHops.length === 0,
    error: local.error,
  };

  const children = childFrames();
  if (children.length === 0) {
    report({ entries: [own], unreachable: 0 });
    return;
  }

  // Which child, if any, is the next hop the user addressed.
  const nextHop = onPath ? remainingHops[0] : undefined;
  const hopTarget = nextHop ? resolveFrameElement(nextHop) : null;

  const state: Pending = {
    outstanding: new Set(children),
    entries: [own],
    unreachable: 0,
    timer: window.setTimeout(() => settle(requestId), Math.max(0, deadline - Date.now())),
    finish: report,
  };
  pending.set(requestId, state);

  for (const child of children) {
    const childOnPath = hopTarget !== null && child === hopTarget;
    sendToFrame(child, {
      __psp: true,
      type: 'PSP_FRAME_EVALUATE',
      requestId,
      selector,
      remainingHops: childOnPath ? remainingHops.slice(1) : [],
      onPath: childOnPath,
      deadline,
      highlight,
    });
  }
}

/**
 * Handle an upward PSP_FRAME_EVALUATE_RESULT from a child: prepend our hop to
 * everything it reported, then settle if that was the last outstanding child.
 */
export function collectFromChild(
  requestId: string,
  source: MessageEventSource | null,
  entries: FrameEvaluation[],
  unreachable: number,
): void {
  const state = pending.get(requestId);
  if (!state) return;

  const frame = findFrameElement(source);
  if (!frame || !state.outstanding.has(frame)) return;
  state.outstanding.delete(frame);

  const hop = hopForFrame(frame);
  for (const entry of entries)
    state.entries.push({ ...entry, frameChain: [hop, ...entry.frameChain] });
  state.unreachable += unreachable;

  if (state.outstanding.size === 0) settle(requestId);
}

/**
 * Report whatever we have. Children still outstanding at the deadline are
 * counted as unreachable rather than silently dropped — a cross-origin frame we
 * were never injected into must show up in the panel, not vanish.
 */
function settle(requestId: string): void {
  const state = pending.get(requestId);
  if (!state) return;
  pending.delete(requestId);
  window.clearTimeout(state.timer);
  state.finish({
    entries: state.entries,
    unreachable: state.unreachable + state.outstanding.size,
  });
}
