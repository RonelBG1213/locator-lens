/**
 * The single source of truth for every message crossing a context boundary.
 *
 * Topology — the top frame is the coordinator:
 *
 *   side panel  <--chrome.runtime-->  top frame content script
 *                                          |  window.postMessage
 *                                          v
 *                                     child frames
 *
 * The side panel never addresses sub-frames directly. Child frames bubble picks
 * up to their parent, which prepends a frameLocator hop (see content/frames.ts).
 */
import type { EvaluationResult, PickResult, Settings } from './types.js';

/** Side panel -> top frame content script. */
export type PanelToContent =
  | { type: 'PSP_PING' }
  | { type: 'PSP_SET_MODE'; mode: 'idle' | 'pick' }
  | { type: 'PSP_EVALUATE'; selector: string }
  | { type: 'PSP_HIGHLIGHT'; selector: string | null }
  | { type: 'PSP_SETTINGS'; settings: Settings };

/** Top frame content script -> side panel. */
export type ContentToPanel =
  | { type: 'PSP_PICKED'; result: PickResult }
  | { type: 'PSP_MODE_CHANGED'; mode: 'idle' | 'pick' };

/** Responses returned synchronously from a PanelToContent request. */
export interface ContentResponses {
  PSP_PING: { ok: true; url: string };
  PSP_SET_MODE: { ok: true };
  PSP_EVALUATE: EvaluationResult;
  PSP_HIGHLIGHT: { ok: true };
  PSP_SETTINGS: { ok: true };
}

/**
 * Messages passed between frames with window.postMessage. Namespaced because the
 * host page shares this channel; every handler must check `__psp` before acting.
 */
export type FrameMessage =
  | { __psp: true; type: 'PSP_FRAME_SET_MODE'; mode: 'idle' | 'pick' }
  | { __psp: true; type: 'PSP_FRAME_BUBBLE'; result: PickResult };

export function isFrameMessage(data: unknown): data is FrameMessage {
  return typeof data === 'object' && data !== null && (data as { __psp?: unknown }).__psp === true;
}
