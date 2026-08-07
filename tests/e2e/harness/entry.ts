/**
 * Test harness: exposes the extension's real analysis pipeline to the page so a
 * Playwright test can compare its output against Playwright itself.
 *
 * This imports the same modules the content script does. It exists only so the
 * pipeline can be driven without the chrome.* APIs that the content script needs.
 */
import { candidatesFor, detectRetarget } from '../../../src/engine/generate.js';
import { inspect } from '../../../src/engine/inspect.js';
import { evaluateLocal } from '../../../src/engine/query.js';
import { parseLocatorInput } from '../../../src/core/locatorInput.js';
import { setTestIdAttribute, testIdAttribute } from '../../../src/engine/bootstrap.js';
import { rank } from '../../../src/core/rank.js';
import { toAxisSelectors } from '../../../src/core/axisSelectors.js';
import { toCssPath, toXPath } from '../../../src/core/rawSelectors.js';
import { pageExpression } from '../../../src/shared/expression.js';
import type { Candidate, ElementInfo, Retarget } from '../../../src/shared/types.js';

/** Attribute the round-trip test uses to confirm identity. Applied after analysis. */
const MARK = 'data-psp-roundtrip';

export interface Analysis {
  index: number;
  tagName: string;
  /** Full `page.…` expression for the best candidate. */
  expression: string;
  best: Candidate;
  candidates: Candidate[];
  info: ElementInfo;
  css: string;
  xpath: string;
  /** Anchored forms; null when no anchor was found within range. */
  axisCss: string | null;
  axisXpath: string | null;
  anchor: string | null;
  retarget: Retarget | null;
}

let targets: Element[] = [];

/**
 * Every element worth analysing, including those inside open shadow roots.
 * Skips the structural wrappers that no test would ever locate.
 */
function collect(root: ParentNode): Element[] {
  const out: Element[] = [];
  const skip = new Set(['HTML', 'HEAD', 'META', 'TITLE', 'STYLE', 'SCRIPT', 'BODY']);

  const walk = (node: ParentNode) => {
    for (const element of Array.from(node.children)) {
      if (!skip.has(element.tagName)) out.push(element);
      if (element.shadowRoot) walk(element.shadowRoot);
      walk(element);
    }
  };

  walk(root);
  return out;
}

const api = {
  /** Re-scan the document. Returns how many targets were found. */
  collect(): number {
    targets = collect(document);
    return targets.length;
  },

  setTestId(name: string): void {
    setTestIdAttribute(name);
  },

  /** Run the full pipeline over target `index`. */
  analyze(index: number): Analysis | null {
    const element = targets[index];
    if (!element) return null;

    const candidates = rank(candidatesFor(element));
    const best = candidates[0];
    if (!best) return null;

    return {
      index,
      tagName: element.tagName.toLowerCase(),
      expression: pageExpression([], best.locator),
      best,
      candidates,
      info: inspect(element),
      css: toCssPath(element),
      xpath: toXPath(element),
      ...toAxisSelectors(element, testIdAttribute()),
      retarget: detectRetarget(element, best.selector),
    };
  },

  /** Analyse a single element addressed by CSS, for the named assertions. */
  analyzeSelector(cssSelector: string): Analysis | null {
    const element = document.querySelector(cssSelector);
    if (!element) return null;
    targets = [element];
    return api.analyze(0);
  },

  /**
   * Main-frame-only evaluation, mirroring what the content script does before it
   * fans out across frames. Cross-frame aggregation needs the real frame tree and
   * is covered by tests/e2e/extension.spec.ts instead.
   */
  evaluate(input: string) {
    const parsed = parseLocatorInput(input, testIdAttribute());
    if (!parsed.ok)
      return { selector: null, error: parsed.error, matchCount: null, previews: [], strictViolation: false, frameHops: 0 };

    const local = evaluateLocal(parsed.value.selector);
    return {
      selector: parsed.value.selector,
      error: local.error,
      // null, not 0: a rejected selector is not the same as an empty page.
      matchCount: local.error === null ? local.elements.length : null,
      previews: local.previews,
      strictViolation: local.elements.length > 1,
      frameHops: parsed.value.frameSelectors.length,
    };
  },

  /** Tag a target so the test can confirm Playwright resolved the same node. */
  mark(index: number): boolean {
    const element = targets[index];
    if (!element) return false;
    element.setAttribute(MARK, 'yes');
    return true;
  },

  unmark(): void {
    for (const element of document.querySelectorAll(`[${MARK}]`)) element.removeAttribute(MARK);
    for (const host of document.querySelectorAll('*')) {
      if (!host.shadowRoot) continue;
      for (const element of host.shadowRoot.querySelectorAll(`[${MARK}]`))
        element.removeAttribute(MARK);
    }
  },

  /** Resolve a selector via the vendored engine and report whether it is unique. */
  resolvesUniquely(selector: string): boolean {
    return evaluateLocal(selector).elements.length === 1;
  },
};

declare global {
  interface Window {
    __psp: typeof api;
  }
}

window.__psp = api;
