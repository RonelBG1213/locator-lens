/**
 * Types for the vendored Playwright engine. Hand-written: the generated file is
 * untyped JavaScript extracted from playwright-core internals.
 *
 * Only the members we actually use are declared. Everything here was verified
 * against playwright-core@1.58.2 — see tests/e2e/engine.spec.ts, which fails
 * loudly if a member disappears after `npm run vendor`.
 */

export declare const PLAYWRIGHT_CORE_VERSION: string;

/** Opaque parsed-selector handle produced by `parseSelector`. */
export type ParsedSelector = { readonly __brand: 'ParsedSelector' };

export interface InjectedScriptOptions {
  isUnderTest: boolean;
  sdkLanguage: 'javascript' | 'python' | 'java' | 'csharp';
  testIdAttributeName: string;
  stableRafCount: number;
  browserName: string;
  isUtilityWorld: boolean;
  customEngines: Array<{ name: string; source: string }>;
}

export interface GenerateSelectorResult {
  /** Playwright's preferred selector — what codegen would emit. */
  selector: string;
  /** All viable candidates, best first. Present when `multiple: true`. */
  selectors: string[];
  elements: unknown[];
}

export interface InjectedScriptUtils {
  asLocator(language: string, selector: string): string;
  getAriaRole(element: Element): string | null;
  getElementAccessibleName(element: Element, includeHidden: boolean): string;
  getElementAccessibleDescription(element: Element, includeHidden: boolean): string;
  isElementVisible(element: Element): boolean;
  elementText(cache: Map<Element, unknown>, element: Element): { full: string; normalized: string };
  normalizeWhiteSpace(text: string): string;
}

export interface InjectedScript {
  readonly utils: InjectedScriptUtils;
  generateSelectorSimple(element: Element, options?: { testIdAttributeName?: string }): string;
  generateSelector(
    element: Element,
    options: { multiple: boolean; testIdAttributeName?: string },
  ): GenerateSelectorResult;
  parseSelector(selector: string): ParsedSelector;
  querySelectorAll(parsed: ParsedSelector, root: Node): Element[];
  previewNode(node: Node): string;
  elementState(
    element: Element,
    state: 'visible' | 'enabled' | 'disabled' | 'editable' | 'checked' | 'unchecked',
  ): boolean | { received: unknown };
}

export declare function createInjectedScript(options: InjectedScriptOptions): InjectedScript;
