/**
 * Anchored CSS and XPath: the same element expressed relative to its nearest
 * uniquely identifiable neighbour, rather than as a path from the document root.
 *
 * The absolute forms in rawSelectors.ts are correct but unreadable, and every
 * intermediate element in them is a thing that can change. This finds a nearby
 * element that can be named on its own — an id, a test id, a unique attribute or
 * class — and expresses the target from there, using XPath's axes and the CSS
 * combinators that mirror them.
 *
 * The search is bounded on purpose: five ancestors up, five siblings each way.
 * Beyond that the "relationship" is a coincidence of layout, not something worth
 * putting in a selector, so nothing is emitted at all.
 *
 * Nothing leaves this module unverified — every candidate is resolved against the
 * live document and dropped unless it matches exactly the element it was built
 * from. Showing nothing is fine; showing a selector that points somewhere else is
 * the one outcome this must never produce.
 *
 * Like the absolute forms, these are reference output for DevTools and other
 * tools — they are never offered as Playwright locators and never scored.
 */
import { isAnchorId, quote, siblingIndex } from './rawSelectors.js';

/** How far up the tree an anchor may be found. */
const MAX_ANCESTORS = 5;
/** How far across, in each direction, an anchor may be found. */
const MAX_SIBLINGS = 5;

/** Attributes worth anchoring on, most meaningful first. */
const ANCHOR_ATTRIBUTES = [
  'name',
  'aria-label',
  'role',
  'type',
  'title',
  'alt',
  'for',
  'placeholder',
  'href',
];

/** Values longer than this are boilerplate (inline styles, data blobs), not identity. */
const MAX_VALUE_LENGTH = 100;

export interface AxisSelectors {
  /** Anchored CSS, or null when no anchor was found or the result did not verify. */
  axisCss: string | null;
  /** Anchored XPath, same conditions. */
  axisXpath: string | null;
  /** Human-readable anchor, e.g. `#gallery, 2 levels up`. Null when there is none. */
  anchor: string | null;
}

const NONE: AxisSelectors = { axisCss: null, axisXpath: null, anchor: null };

/** How the anchor is identified, and where it sits relative to the target. */
interface Anchor {
  element: Element;
  /** Document-unique CSS for the anchor itself. */
  css: string;
  /** Document-unique XPath for the anchor itself. */
  xpath: string;
  relation: 'ancestor' | 'preceding' | 'following';
  /** Parents up, or siblings across. */
  distance: number;
}

/** A way of naming one element on its own, in both syntaxes. */
interface Identity {
  css: string;
  xpath: string;
}

/**
 * Both anchored forms for `element`, or all-null when it has no usable anchor
 * within range.
 *
 * `testIdAttributeName` should be whatever the engine is configured with, so the
 * anchor agrees with the test id the ranked locators use.
 */
export function toAxisSelectors(element: Element, testIdAttributeName: string): AxisSelectors {
  const anchor = findAnchor(element, testIdAttributeName);
  if (!anchor) return NONE;

  const css = buildCss(element, anchor);
  const xpath = buildXPath(element, anchor);

  const axisCss = css && resolvesToCss(css, element) ? css : null;
  const axisXpath = xpath && resolvesToXPath(xpath, element) ? xpath : null;

  // An anchor nothing could be built from is not worth naming.
  if (!axisCss && !axisXpath) return NONE;

  return { axisCss, axisXpath, anchor: describe(anchor) };
}

// ---------------------------------------------------------------- anchor search

/**
 * The nearest element that can be named on its own: ancestors first, then
 * siblings. Preceding siblings are tried before following ones because CSS can
 * express "after this" natively and needs `:has()` for the reverse.
 */
function findAnchor(element: Element, testIdAttributeName: string): Anchor | null {
  let node = element.parentElement;
  for (let distance = 1; node && distance <= MAX_ANCESTORS; distance++) {
    // <body> is not an anchor: scoping to it says nothing the absolute path doesn't.
    if (node.tagName === 'BODY' || node.tagName === 'HTML') break;

    const identity = identify(node, testIdAttributeName);
    if (identity) return { ...identity, element: node, relation: 'ancestor', distance };
    node = node.parentElement;
  }

  const preceding = scanSiblings(element, testIdAttributeName, 'preceding');
  if (preceding) return preceding;

  return scanSiblings(element, testIdAttributeName, 'following');
}

function scanSiblings(
  element: Element,
  testIdAttributeName: string,
  relation: 'preceding' | 'following',
): Anchor | null {
  const step = (node: Element) =>
    relation === 'preceding' ? node.previousElementSibling : node.nextElementSibling;

  let node = step(element);
  for (let distance = 1; node && distance <= MAX_SIBLINGS; distance++) {
    const identity = identify(node, testIdAttributeName);
    if (identity) return { ...identity, element: node, relation, distance };
    node = step(node);
  }
  return null;
}

/**
 * Name one element on its own, in priority order, taking the first form that
 * resolves to it and nothing else. Null when the element has no such handle.
 */
function identify(element: Element, testIdAttributeName: string): Identity | null {
  const tag = element.tagName.toLowerCase();

  if (element.id && isAnchorId(element.id)) {
    const css = `#${CSS.escape(element.id)}`;
    if (isUnique(css, element)) return { css, xpath: `//*[@id=${quote(element.id)}]` };
  }

  for (const [name, value] of anchorAttributes(element, testIdAttributeName)) {
    // A test id is a contract on its own; anything else is only safe with its tag.
    const prefix = name === testIdAttributeName ? '' : tag;
    const css = `${prefix}[${name}="${escapeCssString(value)}"]`;
    if (isUnique(css, element))
      return { css, xpath: `//${prefix || '*'}[@${name}=${quote(value)}]` };
  }

  for (const className of Array.from(element.classList)) {
    const css = `${tag}.${CSS.escape(className)}`;
    if (isUnique(css, element)) {
      // XPath 1.0 has no class accessor; the padded-contains idiom is the standard
      // way to match one class out of a space-separated list.
      const padded = quote(` ${className} `);
      const xpath = `//${tag}[contains(concat(' ',normalize-space(@class),' '),${padded})]`;
      return { css, xpath };
    }
  }

  return null;
}

/** Anchor-worthy attributes, most meaningful first, boilerplate values dropped. */
function anchorAttributes(element: Element, testIdAttributeName: string): Array<[string, string]> {
  const names = [
    testIdAttributeName,
    ...ANCHOR_ATTRIBUTES,
    ...element.getAttributeNames().filter((n) => n.startsWith('data-') && n !== testIdAttributeName),
  ];

  const out: Array<[string, string]> = [];
  for (const name of names) {
    const value = element.getAttribute(name);
    if (!value || value.length > MAX_VALUE_LENGTH || /[\r\n]/.test(value)) continue;
    out.push([name, value]);
  }
  return out;
}

// -------------------------------------------------------------------- builders

/** Anchor-first descent, preferring the shortest form that still resolves. */
function buildXPath(element: Element, anchor: Anchor): string | null {
  const tag = element.tagName.toLowerCase();

  if (anchor.relation === 'ancestor') {
    const short = `${anchor.xpath}/descendant::${tag}`;
    if (resolvesToXPath(short, element)) return short;

    const chain = childChain(element, anchor.element, (node, index) => {
      const step = node.tagName.toLowerCase();
      return index === null ? `child::${step}` : `child::${step}[${index}]`;
    });
    return chain.length ? `${anchor.xpath}/${chain.join('/')}` : null;
  }

  // Walk from the anchor toward the target, so the axis is the mirror of where
  // the anchor was found relative to it.
  const axis = anchor.relation === 'preceding' ? 'following-sibling' : 'preceding-sibling';
  const index = siblingAxisIndex(element, anchor);
  return `${anchor.xpath}/${axis}::${tag}${index === null ? '' : `[${index}]`}`;
}

/** The same logic in CSS, within what its combinators can express. */
function buildCss(element: Element, anchor: Anchor): string | null {
  const tag = element.tagName.toLowerCase();

  if (anchor.relation === 'ancestor') {
    const short = `${anchor.css} ${tag}`;
    if (resolvesToCss(short, element)) return short;

    const chain = childChain(element, anchor.element, (node, index) => {
      const step = node.tagName.toLowerCase();
      return index === null ? step : `${step}:nth-of-type(${index})`;
    });
    return chain.length ? `${anchor.css} > ${chain.join(' > ')}` : null;
  }

  const combinator = anchor.distance === 1 ? '+' : '~';
  const nth = siblingIndex(element);

  if (anchor.relation === 'preceding') {
    const short = `${anchor.css} ${combinator} ${tag}`;
    if (resolvesToCss(short, element)) return short;
    return nth === null ? null : `${anchor.css} ~ ${tag}:nth-of-type(${nth})`;
  }

  // The anchor sits after the target and CSS has no backwards combinator, so the
  // relationship has to be stated as a condition on the target instead.
  const short = `${tag}:has(${combinator} ${anchor.css})`;
  if (resolvesToCss(short, element)) return short;
  return nth === null ? null : `${tag}:nth-of-type(${nth}):has(${combinator} ${anchor.css})`;
}

/**
 * Steps from `ancestor` (exclusive) down to `element` (inclusive), outermost
 * first. Each step is rendered by `format`, which receives the same "null when
 * it is the only one of its tag" index the absolute paths use.
 */
function childChain(
  element: Element,
  ancestor: Element,
  format: (node: Element, index: number | null) => string,
): string[] {
  const steps: string[] = [];
  let node: Element | null = element;

  while (node && node !== ancestor) {
    steps.unshift(format(node, siblingIndex(node)));
    node = node.parentElement;
  }

  // The walk fell off the top without meeting the anchor — not an ancestor after all.
  return node === ancestor ? steps : [];
}

/**
 * The target's 1-based position among the same-tag elements the sibling axis
 * covers, or null when it is the only one — in which case the bare axis step is
 * already unambiguous.
 */
function siblingAxisIndex(element: Element, anchor: Anchor): number | null {
  const parent = anchor.element.parentElement;
  if (!parent) return null;

  const children = Array.from(parent.children);
  const from = children.indexOf(anchor.element);
  if (from < 0) return null;

  // Axis order is outward from the anchor, so the backwards axis reads reversed.
  const inAxis =
    anchor.relation === 'preceding'
      ? children.slice(from + 1)
      : children.slice(0, from).reverse();

  const sameTag = inAxis.filter((node) => node.tagName === element.tagName);
  if (sameTag.length <= 1) return null;

  const position = sameTag.indexOf(element);
  return position < 0 ? null : position + 1;
}

// ---------------------------------------------------------------- verification

/**
 * Note these use the native DOM APIs rather than engine/query.ts: that resolver
 * parses Playwright's selector syntax, which is the wrong grammar for a raw CSS
 * or XPath string. Neither reaches into shadow roots, so a target inside one
 * yields no anchored form at all — the same limit the absolute paths have.
 */
function resolvesToCss(selector: string, element: Element): boolean {
  try {
    const found = document.querySelectorAll(selector);
    return found.length === 1 && found[0] === element;
  } catch {
    return false;
  }
}

function resolvesToXPath(expression: string, element: Element): boolean {
  try {
    const result = document.evaluate(
      expression,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );
    return result.snapshotLength === 1 && result.snapshotItem(0) === element;
  } catch {
    return false;
  }
}

const isUnique = resolvesToCss;

// ----------------------------------------------------------------- formatting

function describe(anchor: Anchor): string {
  if (anchor.relation === 'ancestor')
    return `${anchor.css}, ${plural(anchor.distance, 'level')} up`;

  const where = anchor.relation === 'preceding' ? 'before' : 'after';
  return `${anchor.css}, ${plural(anchor.distance, 'sibling')} ${where}`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Escape a value for use inside a double-quoted CSS attribute selector. */
function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
