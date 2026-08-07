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

/** Send a message to every immediate child frame. */
export function broadcastDown(message: FrameMessage): void {
  for (const frame of document.querySelectorAll('iframe, frame')) {
    (frame as HTMLIFrameElement).contentWindow?.postMessage(message, '*');
  }
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

/** Locate the <iframe>/<frame> element in this document whose window is `source`. */
function findFrameElement(source: MessageEventSource | null): Element | null {
  if (!source) return null;
  for (const frame of document.querySelectorAll('iframe, frame')) {
    if ((frame as HTMLIFrameElement).contentWindow === source) return frame;
  }
  return null;
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
