/**
 * Types for the vendored selector-text tooling. Hand-written; the generated file
 * is untyped JavaScript bundled from playwright-core internals.
 *
 * Verified against playwright-core@1.58.2 by tests/unit/locatorInput.spec.ts,
 * which runs these functions directly in Node — they are isomorphic, so unlike
 * the injected script they need no browser.
 */

/** A parsed selector. Opaque here; only ever round-tripped via stringifySelector. */
export type ParsedSelector = { readonly __brand: 'ParsedSelector' };

/**
 * Convert locator source or raw selector syntax into a selector string.
 *
 * Accepts `getByRole('button', { name: 'Save' })`, chained locators, and
 * `frameLocator(...)` hops (encoded in the result as `internal:control=enter-frame`
 * parts). Raw selector syntax passes through unchanged.
 *
 * Returns "" when the input cannot be parsed — it does NOT throw, despite the
 * name. Note it also rejects a leading `page.`; strip that first.
 */
export declare function unsafeLocatorOrSelectorAsSelector(
  language: 'javascript' | 'python' | 'java' | 'csharp',
  locator: string,
  testIdAttributeName: string,
): string;

/**
 * Split a selector at its frame boundaries. Returns one entry per frame, the
 * last being the selector for the target element. A selector with no frame hops
 * yields a single entry.
 *
 * Takes the selector STRING, not a parsed selector.
 */
export declare function splitSelectorByFrame(selector: string): ParsedSelector[];

export declare function stringifySelector(parsed: ParsedSelector): string;

/** Throws on invalid input. */
export declare function parseSelector(selector: string): ParsedSelector;
