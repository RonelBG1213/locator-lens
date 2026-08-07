/**
 * Test harness: exposes the extension's real analysis pipeline to the page so a
 * Playwright test can compare its output against Playwright itself.
 *
 * This imports the same modules the content script does. It exists only so the
 * pipeline can be driven without the chrome.* APIs that the content script needs.
 */
import { candidatesFor, detectRetarget } from '../../../src/engine/generate.js';
import { inspect } from '../../../src/engine/inspect.js';
import { evaluate } from '../../../src/engine/query.js';
import { setTestIdAttribute } from '../../../src/engine/bootstrap.js';
import { rank } from '../../../src/core/rank.js';
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

  evaluate,

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

  /** Resolve a selector via the vendored engine, returning the marked flag. */
  resolvesToMarked(selector: string): boolean {
    const result = evaluate(selector);
    return result.matchCount === 1;
  },
};

declare global {
  interface Window {
    __psp: typeof api;
  }
}

window.__psp = api;
