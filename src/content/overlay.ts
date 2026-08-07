/**
 * The in-page visuals: hover outline, a label showing the element's role/name,
 * and highlight boxes for every match of the selector being edited.
 *
 * Lives in a closed shadow root attached to <html> so that neither the page's CSS
 * nor its scripts can see or restyle it, and everything is pointer-events:none so
 * it never intercepts the click we are trying to capture.
 */

const HOST_ID = 'locator-lens-overlay';

const STYLES = `
  :host { all: initial; }
  .layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 2147483647;
  }
  .box {
    position: fixed;
    box-sizing: border-box;
    pointer-events: none;
    border: 2px solid #2d7ff9;
    background: rgba(45, 127, 249, 0.12);
    border-radius: 2px;
  }
  .box.match { border-color: #16a34a; background: rgba(22, 163, 74, 0.12); }
  .box.ambiguous { border-color: #ea580c; background: rgba(234, 88, 12, 0.14); }
  .label {
    position: fixed;
    max-width: 340px;
    padding: 3px 7px;
    border-radius: 3px;
    background: #16223a;
    color: #f4f7fb;
    font: 500 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }
`;

type BoxKind = 'hover' | 'match' | 'ambiguous';

let root: ShadowRoot | null = null;
let layer: HTMLDivElement | null = null;
let suppressed = false;

function ensureLayer(): HTMLDivElement {
  if (layer?.isConnected) return layer;

  const host = document.createElement('div');
  host.id = HOST_ID;
  applySuppression(host);
  // Attach to documentElement, not body: some pages replace body wholesale.
  document.documentElement.appendChild(host);

  root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STYLES;
  root.appendChild(style);

  layer = document.createElement('div');
  layer.className = 'layer';
  root.appendChild(layer);
  return layer;
}

function drawBox(rect: DOMRect, kind: BoxKind): void {
  const box = document.createElement('div');
  box.className = kind === 'hover' ? 'box' : `box ${kind}`;
  box.style.left = `${rect.left}px`;
  box.style.top = `${rect.top}px`;
  box.style.width = `${rect.width}px`;
  box.style.height = `${rect.height}px`;
  ensureLayer().appendChild(box);
}

function drawLabel(rect: DOMRect, text: string): void {
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = text;
  // Prefer above the element; flip below when it would clip off the top.
  const above = rect.top >= 22;
  label.style.left = `${Math.max(2, rect.left)}px`;
  label.style.top = above ? `${rect.top - 20}px` : `${rect.bottom + 4}px`;
  ensureLayer().appendChild(label);
}

/** Outline the element under the cursor, with a role/name caption. */
export function showHover(element: Element, caption: string): void {
  clear();
  const rect = element.getBoundingClientRect();
  drawBox(rect, 'hover');
  if (caption) drawLabel(rect, caption);
}

/**
 * Outline every match of the selector being edited. More than one match is drawn
 * in orange, because that is a strict-mode violation waiting to happen.
 */
export function showMatches(elements: Element[]): void {
  clear();
  const kind: BoxKind = elements.length > 1 ? 'ambiguous' : 'match';
  for (const element of elements) drawBox(element.getBoundingClientRect(), kind);
  if (elements.length > 1 && elements[0])
    drawLabel(elements[0].getBoundingClientRect(), `${elements.length} matches — not unique`);
}

export function clear(): void {
  if (layer) layer.replaceChildren();
}

/**
 * Hide the overlay without forgetting what it was showing.
 *
 * A screenshot photographs the page as it stands, so the picker's own highlight
 * boxes would end up in the picture. Hiding rather than clearing means the boxes
 * are still there when the capture is over — the selector the user is editing
 * stays highlighted across a screenshot instead of blinking out.
 *
 * Inline display beats the `:host { all: initial }` rule inside the shadow root,
 * and clearing it back to '' restores exactly what that rule specified.
 */
export function setSuppressed(value: boolean): void {
  if (suppressed === value) return;
  suppressed = value;
  if (root) applySuppression(root.host as HTMLElement);
}

function applySuppression(host: HTMLElement): void {
  host.style.display = suppressed ? 'none' : '';
}

/** Remove the overlay entirely; used when pick mode is turned off. */
export function destroy(): void {
  root?.host.remove();
  root = null;
  layer = null;
}
