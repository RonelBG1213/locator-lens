/**
 * Parses what the user types into the live editor.
 *
 * Accepts everything you might realistically paste:
 *   - locator source        getByRole('button', { name: 'Save' })
 *   - with the page prefix  page.getByRole('button', { name: 'Save' })
 *   - frame hops            page.frameLocator('#modal').getByLabel('Note')
 *   - chained/filtered      getByRole('row', { name: 'Globex' }).getByRole('button')
 *   - raw selector syntax   internal:role=button[name="Save"i]  |  #save-btn
 *
 * Frame hops matter: Playwright encodes them as `internal:control=enter-frame`
 * parts, and a selector cannot cross a frame boundary in one query. Splitting
 * them out here is what lets the content script route evaluation into the frame
 * the user actually addressed.
 *
 * Pure — no DOM, no engine instance — so tests/unit/locatorInput.spec.ts covers
 * it in Node.
 */
import {
  splitSelectorByFrame,
  stringifySelector,
  unsafeLocatorOrSelectorAsSelector,
} from '../vendor/locatorParser.generated.js';

export interface ParsedInput {
  /**
   * Selectors for each `frameLocator(...)` hop, outermost first. Empty when the
   * expression targets the main frame.
   */
  frameSelectors: string[];
  /** The selector to run inside the target frame. */
  selector: string;
}

export type ParseOutcome = { ok: true; value: ParsedInput } | { ok: false; error: string };

/** Panel output starts with `page.`, but Playwright's parser rejects that prefix. */
const PAGE_PREFIX = /^\s*(?:await\s+)?page\s*\./;

export function parseLocatorInput(input: string, testIdAttributeName: string): ParseOutcome {
  const trimmed = stripPagePrefix(input);
  if (!trimmed) return { ok: false, error: 'Enter a locator or selector.' };

  // Returns "" rather than throwing, despite the name.
  const selector = unsafeLocatorOrSelectorAsSelector('javascript', trimmed, testIdAttributeName);
  if (!selector) return { ok: false, error: 'Not a valid Playwright locator or selector.' };

  let parts: string[];
  try {
    parts = splitSelectorByFrame(selector).map(stringifySelector);
  } catch (error) {
    return { ok: false, error: firstLine(error) };
  }

  const target = parts.pop();
  if (!target) return { ok: false, error: 'Not a valid Playwright locator or selector.' };

  return { ok: true, value: { frameSelectors: parts, selector: target } };
}

/**
 * Strip a leading `page.` (or `await page.`) so the panel's own copy output can
 * be pasted straight back in.
 */
export function stripPagePrefix(input: string): string {
  return input.replace(PAGE_PREFIX, '').trim();
}

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0]?.replace(/^Error:\s*/, '') ?? 'Invalid selector';
}
