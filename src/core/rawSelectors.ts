/**
 * CSS and XPath forms of an element, for pasting into DevTools or non-Playwright
 * tools. Deliberately NOT offered as Playwright locators — they are reference
 * output, and the ranking layer scores real CSS candidates well below role-based
 * ones for exactly the reasons these paths illustrate.
 *
 * Both walk up to the nearest stable anchor (an id) and stop, rather than always
 * emitting a full path from <html>.
 */

/** ids safe to anchor on: not numeric-generated, valid as a bare CSS id. */
const SAFE_ID = /^[A-Za-z][\w-]*$/;
const GENERATED_ID = /^[A-Za-z_-]{0,4}\d{5,}$/;

export function isAnchorId(id: string): boolean {
  return SAFE_ID.test(id) && !GENERATED_ID.test(id);
}

/** A short CSS path, anchored on the nearest usable id. */
export function toCssPath(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;

  while (node && node.nodeType === Node.ELEMENT_NODE) {
    if (node.id && isAnchorId(node.id)) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }

    const tag = node.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') {
      parts.unshift(tag);
      break;
    }

    const index = siblingIndex(node);
    parts.unshift(index === null ? tag : `${tag}:nth-of-type(${index})`);
    node = node.parentElement;
  }

  return parts.join(' > ');
}

/** A short XPath, anchored on the nearest usable id. */
export function toXPath(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;

  while (node && node.nodeType === Node.ELEMENT_NODE) {
    if (node.id && isAnchorId(node.id)) {
      const suffix = parts.length ? `/${parts.join('/')}` : '';
      return `//*[@id=${quote(node.id)}]${suffix}`;
    }

    const tag = node.tagName.toLowerCase();
    const index = siblingIndex(node);
    parts.unshift(index === null ? tag : `${tag}[${index}]`);

    if (tag === 'html') break;
    node = node.parentElement;
  }

  return `/${parts.join('/')}`;
}

/**
 * 1-based position among same-tag siblings, or null when the element is the only
 * one of its tag — omitting the index keeps the path shorter and less brittle.
 */
export function siblingIndex(element: Element): number | null {
  const parent = element.parentElement;
  if (!parent) return null;

  const sameTag = Array.from(parent.children).filter((c) => c.tagName === element.tagName);
  if (sameTag.length === 1) return null;
  return sameTag.indexOf(element) + 1;
}

/** XPath has no escape syntax; strings containing both quote types need concat(). */
export function quote(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat('${value.split("'").join(`',"'",'`)}')`;
}
