/**
 * Builds the `frameLocator(...)` chain for elements inside iframes.
 *
 * A content script runs independently in every frame and cannot see its parent's
 * DOM, so no single frame can produce the whole locator. Instead a pick bubbles
 * upward: each frame receives its child's partial result, works out a selector
 * for the <iframe> element that hosts that child, prepends the hop, and passes it
 * on. The top frame ends up holding the complete chain and reports it.
 *
 * Identifying which <iframe> sent the message is the crux. `event.source` is the
 * child's Window, and comparing it against each `iframe.contentWindow` works even
 * cross-origin — Window identity is comparable when the DOM behind it is not.
 */
import { candidatesFor } from '../engine/generate.js';
import { engine } from '../engine/bootstrap.js';
import { isFrameMessage, type FrameMessage } from '../shared/messages.js';
import type { FrameHop, PickResult } from '../shared/types.js';

export const isTopFrame = (): boolean => window === window.top;

/** Every immediate child frame element, in document order. */
export function childFrames(): HTMLIFrameElement[] {
  return Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe, frame'));
}

/** Send a message to every immediate child frame. */
export function broadcastDown(message: FrameMessage): void {
  for (const frame of childFrames()) frame.contentWindow?.postMessage(message, '*');
}

/** Send a message to one specific child frame. */
export function sendToFrame(frame: HTMLIFrameElement, message: FrameMessage): void {
  frame.contentWindow?.postMessage(message, '*');
}

/** The frameLocator hop for a child frame element in this document. */
export function hopForFrame(frame: Element): FrameHop {
  return hopFor(frame);
}

/** Pass a pick up to the parent frame for another hop to be prepended. */
export function bubbleUp(result: PickResult): void {
  window.parent.postMessage({ __psp: true, type: 'PSP_FRAME_BUBBLE', result }, '*');
}

/**
 * Prepend the hop for the child frame that sent `event`, if we can identify it.
 * Returns the augmented result; on failure the result is returned unchanged with
 * a warning attached, so the panel can say the chain is incomplete rather than
 * silently emitting a locator that will not resolve.
 */
export function addHopForSource(event: MessageEvent, result: PickResult): PickResult {
  const iframe = findFrameElement(event.source);

  if (!iframe) {
    return {
      ...result,
      frameChainWarning:
        result.frameChainWarning ??
        'Could not identify the hosting iframe — the frameLocator() prefix is incomplete.',
    };
  }

  const hop = hopFor(iframe);
  return { ...result, frameChain: [hop, ...result.frameChain] };
}

/**
 * Locate the <iframe>/<frame> element in this document whose window is `source`.
 *
 * Window identity is comparable across origins even though the DOM behind it is
 * not, which is what makes the whole bubble-up scheme work cross-origin.
 */
export function findFrameElement(source: MessageEventSource | null): HTMLIFrameElement | null {
  if (!source) return null;
  for (const frame of childFrames()) if (frame.contentWindow === source) return frame;
  return null;
}

/**
 * Where a child frame's viewport origin sits in this document's viewport.
 *
 * A rect measured inside an iframe is relative to that frame's own viewport,
 * which is exactly the iframe element's content box — so lifting a child's rect
 * into our coordinates means adding the element's position plus its border and
 * padding. Applied once per hop on the way up, a pick nested three frames deep
 * arrives at the top in top-document coordinates.
 *
 * Transforms on the iframe are ignored: handling them needs the full matrix, and
 * a rotated or scaled test target is not a thing that happens.
 */
export function frameContentOffset(iframe: Element): { x: number; y: number } {
  const rect = iframe.getBoundingClientRect();
  const style = getComputedStyle(iframe);
  return {
    x: rect.left + px(style.borderLeftWidth) + px(style.paddingLeft),
    y: rect.top + px(style.borderTopWidth) + px(style.paddingTop),
  };
}

/** Computed lengths are always 'Npx', but a detached frame can yield ''. */
function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Generate the best selector for an iframe element and render it as a hop. */
function hopFor(iframe: Element): FrameHop {
  // Reuse the ranking pipeline's raw output: the first candidate is Playwright's
  // own preferred selector for the frame element.
  const [best] = candidatesFor(iframe);
  const selector = best?.selector ?? fallbackFrameSelector(iframe);
  return {
    selector,
    locator: `frameLocator(${JSON.stringify(selector)})`,
  };
}

/** Only reached if generation fails outright; index-based but always resolves. */
function fallbackFrameSelector(iframe: Element): string {
  const all = Array.from(document.querySelectorAll('iframe, frame'));
  return `iframe >> nth=${all.indexOf(iframe)}`;
}

/** Narrow a raw message event to one of ours. */
export function readFrameMessage(event: MessageEvent): FrameMessage | null {
  return isFrameMessage(event.data) ? event.data : null;
}

/** Short description of an iframe, used in the panel's frame breadcrumb. */
export function describeFrame(iframe: Element): string {
  return engine().previewNode(iframe);
}
