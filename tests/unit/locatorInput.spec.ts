/**
 * These run in Node with no browser: the vendored selector-text tooling is
 * Playwright's *isomorphic* code, unlike the injected script.
 *
 * That also makes this the guard on that half of the vendoring — if a future
 * `npm run vendor` changes how locator source maps to selector syntax, or how
 * frame hops are encoded, these fail.
 */
import { describe, expect, it } from 'vitest';
import { parseLocatorInput, stripPagePrefix } from '../../src/core/locatorInput.js';

const TEST_ID = 'data-testid';

/** Unwrap a successful parse, failing loudly otherwise. */
function parse(input: string) {
  const outcome = parseLocatorInput(input, TEST_ID);
  if (!outcome.ok) throw new Error(`expected "${input}" to parse, got: ${outcome.error}`);
  return outcome.value;
}

describe('stripPagePrefix', () => {
  it.each([
    ['page.getByRole("button")', 'getByRole("button")'],
    ['await page.getByRole("button")', 'getByRole("button")'],
    ['  page.getByLabel("Email")  ', 'getByLabel("Email")'],
    ['getByRole("button")', 'getByRole("button")'],
    // A selector that merely starts with the letters "page" must survive intact.
    ['pagination-link', 'pagination-link'],
  ])('%s -> %s', (input, expected) => {
    expect(stripPagePrefix(input)).toBe(expected);
  });
});

describe('parseLocatorInput', () => {
  it('accepts locator source', () => {
    expect(parse("getByRole('button', { name: 'Save' })")).toEqual({
      frameSelectors: [],
      selector: 'internal:role=button[name="Save"i]',
    });
  });

  it('accepts the page. prefix the panel itself emits', () => {
    // Regression guard: Playwright's parser returns "" for a leading `page.`, so
    // without stripping it the panel could not evaluate its own copy output.
    expect(parse("page.getByRole('button', { name: 'Save' })").selector).toBe(
      'internal:role=button[name="Save"i]',
    );
  });

  it('accepts raw selector syntax unchanged', () => {
    expect(parse('#save-btn').selector).toBe('#save-btn');
    expect(parse('internal:role=button[name="Save"i]').selector).toBe(
      'internal:role=button[name="Save"i]',
    );
  });

  it('resolves getByTestId against the configured attribute', () => {
    expect(parse("getByTestId('total')").selector).toBe('internal:testid=[data-testid="total"s]');
    const custom = parseLocatorInput("getByTestId('total')", 'data-qa');
    expect(custom.ok && custom.value.selector).toBe('internal:testid=[data-qa="total"s]');
  });

  it('keeps chained and filtered locators intact', () => {
    expect(parse("getByRole('row', { name: 'Globex' }).getByRole('button')").selector).toBe(
      'internal:role=row[name="Globex"i] >> internal:role=button',
    );
    expect(parse("getByRole('button').nth(1)").selector).toBe('internal:role=button >> nth=1');
  });

  describe('frame hops', () => {
    it('splits a single frameLocator off the target selector', () => {
      expect(parse("page.frameLocator('#modal').getByLabel('Note')")).toEqual({
        frameSelectors: ['#modal'],
        selector: 'internal:label="Note"i',
      });
    });

    it('splits nested frameLocators outermost first', () => {
      // Playwright omits the implicit `css=` engine prefix only on a selector's
      // first part, so the second hop round-trips as `css=#b`. Equivalent when
      // resolved, and these hops are used for routing, never displayed.
      expect(parse("frameLocator('#a').frameLocator('#b').getByLabel('Note')")).toEqual({
        frameSelectors: ['#a', 'css=#b'],
        selector: 'internal:label="Note"i',
      });
    });

    it('does not split on ">>" inside a quoted text selector', () => {
      // String-splitting the selector would corrupt this; we use Playwright's
      // own frame splitter precisely to avoid that.
      const parsed = parse(`frameLocator('#a').getByText('x >> y')`);
      expect(parsed.frameSelectors).toEqual(['#a']);
      expect(parsed.selector).toContain('x >> y');
    });
  });

  describe('rejections', () => {
    it.each([
      ['', 'Enter a locator or selector.'],
      ['   ', 'Enter a locator or selector.'],
    ])('rejects empty input %j', (input, error) => {
      const outcome = parseLocatorInput(input, TEST_ID);
      expect(outcome).toEqual({ ok: false, error });
    });

    it.each(["getByRole(", "getByRole('button'", 'getByNothing("x")'])(
      'rejects unparseable input %j',
      (input) => {
        const outcome = parseLocatorInput(input, TEST_ID);
        expect(outcome.ok).toBe(false);
      },
    );

    it('returns a single-line error suitable for inline display', () => {
      const outcome = parseLocatorInput('getByRole(', TEST_ID);
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error).not.toContain('\n');
    });
  });
});
