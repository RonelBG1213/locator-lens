/**
 * Selector resolution — the half of the engine that makes the panel's match
 * counts trustworthy. Every count here comes from Playwright's own resolver, so
 * "1 match" in the panel means "1 match" in the test.
 */
import { engine } from './bootstrap.js';
import type { EvaluationResult } from '../shared/types.js';

const PREVIEW_LIMIT = 5;

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

/**
 * Evaluate a user-typed selector for the live editor: match count, short
 * previews, and whether Playwright's strict mode would reject it.
 */
export function evaluate(selector: string): EvaluationResult {
  const trimmed = selector.trim();
  if (!trimmed) {
    return { selector, matchCount: null, error: null, previews: [], strictViolation: false };
  }

  const injected = engine();
  let elements: Element[];
  try {
    elements = queryAll(trimmed);
  } catch (error) {
    return {
      selector: trimmed,
      matchCount: null,
      error: cleanEngineError(error),
      previews: [],
      strictViolation: false,
    };
  }

  return {
    selector: trimmed,
    matchCount: elements.length,
    error: null,
    previews: elements.slice(0, PREVIEW_LIMIT).map((el) => injected.previewNode(el)),
    strictViolation: elements.length > 1,
  };
}

/**
 * The engine's parse errors carry a stack and an internal prefix that mean
 * nothing to the user; keep only the first, useful line.
 */
function cleanEngineError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0]?.replace(/^Error:\s*/, '') ?? 'Invalid selector';
}
