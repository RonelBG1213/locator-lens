/**
 * Builds the Inspector pane's view of an element.
 *
 * Role and accessible name come from the engine's own ARIA implementation rather
 * than being re-derived here — that is the whole point of vendoring it. If we
 * computed the accessible name ourselves we would eventually disagree with
 * Playwright, and the panel would confidently show a name that no getByRole
 * lookup can actually match.
 */
import { engine } from './bootstrap.js';
import type { ElementInfo } from '../shared/types.js';

const MAX_TEXT = 200;
const MAX_ATTR_VALUE = 200;
const MAX_ANCESTRY = 6;

export function inspect(element: Element): ElementInfo {
  const injected = engine();
  const { utils } = injected;

  const rect = element.getBoundingClientRect();
  const hasBox = rect.width > 0 || rect.height > 0;

  return {
    tagName: element.tagName.toLowerCase(),
    role: safe(() => utils.getAriaRole(element), null),
    accessibleName: safe(() => utils.getElementAccessibleName(element, false), ''),
    accessibleDescription: safe(() => utils.getElementAccessibleDescription(element, false), ''),
    text: truncate(safe(() => utils.normalizeWhiteSpace(element.textContent ?? ''), ''), MAX_TEXT),
    attributes: Array.from(element.attributes).map((attr) => ({
      name: attr.name,
      value: truncate(attr.value, MAX_ATTR_VALUE),
    })),
    visible: safe(() => utils.isElementVisible(element), false),
    enabled: state(element, 'enabled', true),
    editable: state(element, 'editable', false),
    checked: checkedState(element),
    ancestry: ancestry(element),
    boundingBox: hasBox
      ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      : null,
  };
}

/**
 * `elementState` throws for states that do not apply to an element (asking a
 * <div> whether it is checked, for example) and, depending on the state, may
 * return either a boolean or a `{ received }` wrapper. Normalise both.
 */
function state(element: Element, name: 'enabled' | 'editable', fallback: boolean): boolean {
  return safe(() => {
    const result = engine().elementState(element, name);
    return typeof result === 'boolean' ? result : fallback;
  }, fallback);
}

/** null for elements that have no checked state at all. */
function checkedState(element: Element): boolean | 'mixed' | null {
  const role = safe(() => engine().utils.getAriaRole(element), null);
  if (role !== 'checkbox' && role !== 'radio' && role !== 'menuitemcheckbox' && role !== 'switch')
    return null;
  if (element.getAttribute('aria-checked') === 'mixed') return 'mixed';
  return safe(() => {
    const result = engine().elementState(element, 'checked');
    return typeof result === 'boolean' ? result : null;
  }, null);
}

/** Outermost-first breadcrumb, trimmed to the nearest few ancestors. */
function ancestry(element: Element): string[] {
  const chain: string[] = [];
  let node = element.parentElement;
  while (node && chain.length < MAX_ANCESTRY) {
    chain.unshift(describe(node));
    node = node.parentElement;
  }
  return chain;
}

function describe(element: Element): string {
  const tag = element.tagName.toLowerCase();
  if (element.id) return `${tag}#${element.id}`;
  const firstClass = element.classList.item(0);
  return firstClass ? `${tag}.${firstClass}` : tag;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** The engine throws for inapplicable queries; never let that break a pick. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
