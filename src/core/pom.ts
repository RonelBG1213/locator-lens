/**
 * Emits a page-object class from a multi-pick session.
 *
 * Follows the team's playwright-conventions: readonly locator properties, the
 * page injected via a private constructor parameter, and NO assertions and NO
 * action methods — those are written by hand once the shape of the flow is
 * known. This generates the tedious half only.
 *
 * Pure, so tests/unit/pom.spec.ts covers it without a browser.
 */
import type { SessionEntry } from '../shared/types.js';

/** TypeScript reserved words and Object members we must not shadow. */
const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import',
  'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'yield', 'page', 'constructor', 'toString', 'valueOf',
]);

/** Roles whose elements read better with a suffix, so `save` becomes `saveButton`. */
const ROLE_SUFFIX: Record<string, string> = {
  button: 'Button',
  link: 'Link',
  textbox: 'Input',
  searchbox: 'Input',
  checkbox: 'Checkbox',
  radio: 'Radio',
  combobox: 'Select',
  listbox: 'Select',
  tab: 'Tab',
  heading: 'Heading',
  dialog: 'Dialog',
  alert: 'Alert',
  table: 'Table',
  img: 'Image',
};

/**
 * A property name for one picked element: camelCase, suffixed by role, never
 * reserved, never empty.
 */
export function propertyName(entry: Pick<SessionEntry, 'accessibleName' | 'role'>): string {
  const base = camelCase(entry.accessibleName);

  // With no accessible name there is nothing for a role suffix to qualify, so the
  // role becomes the whole name ("dialog", not "Dialog").
  if (!base) return guard(camelCase(entry.role ?? '') || 'element');

  const suffix = entry.role ? (ROLE_SUFFIX[entry.role] ?? '') : '';
  // Don't duplicate a suffix the name already ends with ("Save Button" -> saveButton).
  const duplicated = suffix && base.toLowerCase().endsWith(suffix.toLowerCase());

  return guard(suffix && !duplicated ? base + suffix : base);
}

/** Assign each entry a unique property name, suffixing duplicates with 2, 3, … */
export function withUniqueNames(entries: SessionEntry[]): SessionEntry[] {
  const used = new Map<string, number>();

  return entries.map((entry) => {
    const base = entry.name || propertyName(entry);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return { ...entry, name: seen === 0 ? base : `${base}${seen + 1}` };
  });
}

/** `Customer Details` / `customer-details.page.ts` -> `CustomerDetailsPage`. */
export function className(pageName: string): string {
  const pascal = pageName
    .replace(/\.page\.ts$/i, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const name = pascal || 'Untitled';
  return name.endsWith('Page') ? name : `${name}Page`;
}

/** `CustomerDetailsPage` -> `customer-details.page.ts`. */
export function fileName(pageName: string): string {
  return `${className(pageName)
    .replace(/Page$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()}.page.ts`;
}

/** Render the page-object source for a session. */
export function generatePageObject(pageName: string, entries: SessionEntry[]): string {
  const cls = className(pageName);
  const named = withUniqueNames(entries);

  if (named.length === 0) {
    return [
      `import type { Page } from '@playwright/test';`,
      ``,
      `export class ${cls} {`,
      `  constructor(private readonly page: Page) {}`,
      `}`,
      ``,
    ].join('\n');
  }

  const properties = named.map((entry) => {
    const comment = entry.accessibleName
      ? `  /** ${entry.role ?? 'element'}: ${escapeComment(entry.accessibleName)} */\n`
      : '';
    return `${comment}  readonly ${entry.name} = this.page.${entry.locator};`;
  });

  return [
    `import type { Page } from '@playwright/test';`,
    ``,
    `export class ${cls} {`,
    properties.join('\n'),
    ``,
    `  constructor(private readonly page: Page) {}`,
    `}`,
    ``,
  ].join('\n');
}

/** Keep the identifier from shadowing a reserved word or the injected `page`. */
function guard(name: string): string {
  return RESERVED.has(name) ? `${name}Locator` : name;
}

function camelCase(value: string): string {
  const words = value
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+|(?<=[a-z0-9])(?=[A-Z])/)
    .filter(Boolean)
    // Long accessible names make unreadable identifiers; four words is plenty.
    .slice(0, 4);

  if (words.length === 0) return '';

  const [first = '', ...rest] = words.map((word) => word.toLowerCase());
  const name =
    first + rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');

  // Identifiers cannot start with a digit.
  return /^\d/.test(name) ? `n${name}` : name;
}

function escapeComment(value: string): string {
  return value.replace(/\*\//g, '*\\/');
}
