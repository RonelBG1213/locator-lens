/**
 * Turns a picked element into the raw candidate list, before ranking.
 *
 * Everything here delegates to Playwright's generator, so the candidates are the
 * ones Playwright itself would consider — we only choose between them.
 */
import { engine, testIdAttribute } from './bootstrap.js';
import { countMatches, queryAll } from './query.js';
import type { LocatorKind, Retarget } from '../shared/types.js';

/** A candidate before core/rank.ts scores it. */
export interface RawCandidate {
  selector: string;
  locator: string;
  kind: LocatorKind;
  matchCount: number;
  isCodegenDefault: boolean;
}

/**
 * All viable selectors for `element`, best-effort deduplicated, each with its
 * match count. The selector Playwright's codegen would emit is flagged.
 */
export function candidatesFor(element: Element): RawCandidate[] {
  const injected = engine();
  const testIdAttributeName = testIdAttribute();

  const generated = injected.generateSelector(element, { multiple: true, testIdAttributeName });
  // `selectors` includes `selector`, but only when `multiple` succeeded; keep both
  // and dedupe so a failure to produce alternatives still yields the default.
  const ordered = dedupe([generated.selector, ...(generated.selectors ?? [])]);

  return ordered.map((selector) => ({
    selector,
    locator: toLocator(selector),
    kind: kindOf(selector),
    matchCount: countMatches(selector) ?? 0,
    isCodegenDefault: selector === generated.selector,
  }));
}

/** Render a Playwright-internal selector as JavaScript locator source. */
export function toLocator(selector: string): string {
  return engine().utils.asLocator('javascript', selector);
}

/**
 * Detect Playwright retargeting the selector away from the clicked element.
 *
 * Returns null in the normal case. When it returns a value the panel must show
 * it — otherwise the user copies a locator that silently points elsewhere.
 */
export function detectRetarget(element: Element, selector: string): Retarget | null {
  let resolved: Element | undefined;
  try {
    resolved = queryAll(selector)[0];
  } catch {
    return null;
  }
  if (!resolved || resolved === element) return null;

  const isAncestor = resolved.contains(element);
  const tagName = resolved.tagName.toLowerCase();

  return {
    tagName,
    role: safeRole(resolved),
    isAncestor,
    note: isAncestor
      ? `This locator targets the enclosing <${tagName}>, not the <${element.tagName.toLowerCase()}> you clicked` +
        (tagName === 'select' ? ' — drive it with selectOption().' : '.')
      : `This locator resolves to a different <${tagName}> element than the one you clicked.`,
  };
}

function safeRole(element: Element): string | null {
  try {
    return engine().utils.getAriaRole(element);
  } catch {
    return null;
  }
}

/**
 * Classify a selector by its strongest signal. Internal selectors are chained
 * with `>>`; the LAST part identifies the target element itself, while earlier
 * parts only scope it, so the last part decides the kind.
 */
export function kindOf(selector: string): LocatorKind {
  const parts = selector.split('>>');
  const last = (parts[parts.length - 1] ?? selector).trim();

  if (last.startsWith('internal:role=')) return 'role';
  if (last.startsWith('internal:label=')) return 'label';
  if (last.startsWith('internal:attr=[placeholder')) return 'placeholder';
  if (last.startsWith('internal:attr=[alt')) return 'alt';
  if (last.startsWith('internal:attr=[title')) return 'title';
  if (last.startsWith('internal:testid=')) return 'testid';
  if (last.startsWith('internal:text=') || last.startsWith('text=')) return 'text';
  if (last.startsWith('internal:')) return 'other';
  return 'css';
}

function dedupe(selectors: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const selector of selectors) {
    if (!selector || seen.has(selector)) continue;
    seen.add(selector);
    out.push(selector);
  }
  return out;
}
