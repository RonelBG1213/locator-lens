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
 * Locator source is read in the caller's language, so whatever the panel copied
 * out can be pasted straight back in: `get_by_role("button", name="Save")` under
 * Python, `GetByRole(AriaRole.Button, new() { Name = "Save" })` under C#. Raw
 * selector syntax is language-neutral and parses under all four.
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
import type { Language } from '../shared/types.js';

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

/**
 * Panel output starts with `page.`, but Playwright's parser rejects that prefix.
 * Capitalised too, because that is how C# spells the property.
 */
const PAGE_PREFIX = /^\s*(?:await\s+)?[Pp]age\s*\./;

export function parseLocatorInput(
  input: string,
  testIdAttributeName: string,
  language: Language = 'javascript',
): ParseOutcome {
  const trimmed = stripPagePrefix(input);
  if (!trimmed) return { ok: false, error: 'Enter a locator or selector.' };

  // Returns "" rather than throwing, despite the name.
  const selector = unsafeLocatorOrSelectorAsSelector(language, trimmed, testIdAttributeName);
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
 * Strip a leading `page.` / `Page.` (or `await page.`) so the panel's own copy
 * output can be pasted straight back in.
 */
export function stripPagePrefix(input: string): string {
  return input.replace(PAGE_PREFIX, '').trim();
}

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0]?.replace(/^Error:\s*/, '') ?? 'Invalid selector';
}
