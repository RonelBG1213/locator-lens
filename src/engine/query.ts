/**
 * Selector resolution within a single document — the half of the engine that
 * makes the panel's match counts trustworthy. Every count comes from Playwright's
 * own resolver, so "1 match" in the panel means "1 match" in the test.
 *
 * Frame-crossing is deliberately NOT handled here: a Playwright selector cannot
 * span a frame boundary in one query. Aggregation across frames lives in
 * content/index.ts, which fans this out over the frame tree.
 */
import { engine } from './bootstrap.js';

const PREVIEW_LIMIT = 5;

/** What one document found for a selector. */
export interface LocalMatches {
  elements: Element[];
  previews: string[];
  /**
   * Set when the engine rejected the selector at resolution time. Distinct from
   * "no matches": some selectors parse but cannot be resolved (`internal:role=`
   * with an empty body, unsupported pseudo-classes). Reporting those as zero
   * would tell the user their page is wrong when their selector is.
   */
  error: string | null;
}

/** Resolve a Playwright selector against this document. Throws on bad syntax. */
export function queryAll(selector: string): Element[] {
  const injected = engine();
  return injected.querySelectorAll(injected.parseSelector(selector), document);
}

/** Count matches, returning null rather than throwing when the selector is invalid. */
export function countMatches(selector: string): number | null {
  try {
    return queryAll(selector).length;
  } catch {
    return null;
  }
}

/** Evaluate in this document only. Never throws; failures come back as `error`. */
export function evaluateLocal(selector: string): LocalMatches {
  const injected = engine();
  try {
    const elements = queryAll(selector);
    return {
      elements,
      previews: elements.slice(0, PREVIEW_LIMIT).map((el) => injected.previewNode(el)),
      error: null,
    };
  } catch (error) {
    return { elements: [], previews: [], error: firstLine(error) };
  }
}

/** Engine errors carry a stack and an internal prefix; keep the useful line. */
function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0]?.replace(/^Error:\s*/, '') ?? 'Invalid selector';
}

/** Resolve a frameLocator hop: the single frame element a hop selector addresses. */
export function resolveFrameElement(selector: string): Element | null {
  try {
    const elements = queryAll(selector);
    // Ambiguous hops are treated as unresolved — Playwright would throw here too.
    return elements.length === 1 ? (elements[0] ?? null) : null;
  } catch {
    return null;
  }
}
