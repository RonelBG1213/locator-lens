/**
 * Where an element sits relative to shadow boundaries.
 *
 * This matters because the two halves of the panel disagree across a boundary.
 * Playwright's engine pierces OPEN shadow roots, so the ranked locators keep
 * working; the CSS and XPath reference forms are plain document queries and do
 * not, so `toCssPath` emits a path that looks absolute but resolves to nothing
 * from the document root. A CLOSED root stops everything, Playwright included.
 *
 * Silently handing back a selector that cannot resolve is the one outcome worth
 * going out of the way to prevent — hence this walk.
 */
import type { ShadowContext } from '../shared/types.js';

const NONE: ShadowContext = { depth: 0, hosts: [], closed: false, isHost: false };

/** The shadow host owning `node`'s tree, or null when it is in the document. */
export function shadowHostOf(node: Node): Element | null {
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

/**
 * Every boundary between the document and `element`, outermost host first.
 *
 * `isHost` is only ever true for an open root: `element.shadowRoot` is null for a
 * closed one, and there is no way to ask.
 */
export function shadowContext(element: Element): ShadowContext {
  const hosts: string[] = [];
  let closed = false;

  let root = element.getRootNode();
  while (root instanceof ShadowRoot) {
    if (root.mode === 'closed') closed = true;
    hosts.unshift(describeHost(root.host));
    root = root.host.getRootNode();
  }

  if (hosts.length === 0 && !element.shadowRoot) return NONE;

  return { depth: hosts.length, hosts, closed, isHost: element.shadowRoot !== null };
}

/** `my-combo#country` — the custom element tag is usually the identifying half. */
function describeHost(host: Element): string {
  const tag = host.tagName.toLowerCase();
  return host.id ? `${tag}#${host.id}` : tag;
}
