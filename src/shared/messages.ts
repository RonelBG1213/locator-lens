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
import type {
  CaptureStart,
  CaptureTarget,
  EvaluationResult,
  FrameEvaluation,
  PickResult,
  Rect,
  Settings,
} from './types.js';

/** Side panel -> top frame content script. */
export type PanelToContent =
  | { type: 'PSP_PING' }
  | { type: 'PSP_SET_MODE'; mode: 'idle' | 'pick' }
  | { type: 'PSP_EVALUATE'; selector: string }
  | { type: 'PSP_HIGHLIGHT'; selector: string | null }
  | { type: 'PSP_SETTINGS'; settings: Settings }
  /**
   * Get the page ready to be photographed: hide the picker's own overlay in every
   * frame, scroll the picked element into view, and report where it landed. The
   * panel calls chrome.tabs.captureVisibleTab itself — the image never crosses
   * this boundary, only the geometry does.
   */
  | {
      type: 'PSP_CAPTURE_BEGIN';
      target: CaptureTarget;
      /** Mark the picked element on a viewport shot. Ignored for an element shot. */
      highlight: boolean;
    }
  /** Put the overlay back. Must be sent even when the capture failed. */
  | { type: 'PSP_CAPTURE_END' };

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
  PSP_CAPTURE_BEGIN: CaptureStart;
  PSP_CAPTURE_END: { ok: true };
}

/**
 * Messages passed between frames with window.postMessage. Namespaced because the
 * host page shares this channel; every handler must check `__psp` before acting.
 */
export type FrameMessage =
  | { __psp: true; type: 'PSP_FRAME_SET_MODE'; mode: 'idle' | 'pick' }
  | { __psp: true; type: 'PSP_FRAME_BUBBLE'; result: PickResult }
  | { __psp: true; type: 'PSP_FRAME_CLEAR_HIGHLIGHT' }
  | {
      __psp: true;
      type: 'PSP_FRAME_EVALUATE';
      requestId: string;
      /** Selector to run in each frame's own document. */
      selector: string;
      /**
       * frameLocator() hops the user typed that are still unmatched at this
       * point in the tree. A frame is the target when this is empty and it is
       * still on the addressed path.
       */
      remainingHops: string[];
      /** False once the walk has diverged from the hops the user typed. */
      onPath: boolean;
      /** Absolute time by which children must answer, so a dead frame can't hang the editor. */
      deadline: number;
      /** Paint matches in this frame while evaluating. */
      highlight: boolean;
    }
  | {
      __psp: true;
      type: 'PSP_FRAME_EVALUATE_RESULT';
      requestId: string;
      /** This frame's own result plus everything its descendants reported. */
      entries: FrameEvaluation[];
      /** Frames in this subtree that missed the deadline, summed up the tree. */
      unreachable: number;
    }
  /**
   * Hide or show every frame's overlay for the duration of a capture. A
   * screenshot photographs the page exactly as it is, highlight boxes included.
   */
  | { __psp: true; type: 'PSP_FRAME_OVERLAY_SUPPRESSED'; suppressed: boolean }
  /**
   * Where is the picked element right now? Broadcast to the whole tree; only the
   * one frame still holding a pick answers, so unlike PSP_FRAME_EVALUATE this
   * needs no collect-every-child bookkeeping.
   */
  | {
      __psp: true;
      type: 'PSP_FRAME_MEASURE_PICK';
      requestId: string;
      /**
       * Bring the element into view before measuring. True for an element shot,
       * which is useless if the element is off-screen; false for a viewport shot,
       * which must photograph the viewport the user is actually looking at.
       */
      scroll: boolean;
    }
  | {
      __psp: true;
      type: 'PSP_FRAME_MEASURE_PICK_RESULT';
      requestId: string;
      /** Viewport coordinates of the frame that sent this; each parent adds its own offset. */
      rect: Rect;
    };

export function isFrameMessage(data: unknown): data is FrameMessage {
  return typeof data === 'object' && data !== null && (data as { __psp?: unknown }).__psp === true;
}
