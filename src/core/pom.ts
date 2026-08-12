/**
 * Emits a page-object class from a multi-pick session, in any of the four
 * Playwright client languages.
 *
 * Follows the team's playwright-conventions: readonly locator properties, the
 * page injected via the constructor, and NO assertions and NO action methods —
 * those are written by hand once the shape of the flow is known. This generates
 * the tedious half only.
 *
 * This file owns naming and dispatch; the class templates live in
 * core/pomEmitters.ts. Pure, so tests/unit/pom.spec.ts covers it without a
 * browser.
 */
import { EMITTERS } from './pomEmitters.js';
import type { Language, SessionEntry } from '../shared/types.js';

/**
 * Identifiers we must not emit, per language: reserved words, plus the members
 * of the generated class itself that a property would otherwise shadow.
 *
 * Not exhaustive language grammars — these are the words an accessible name
 * realistically produces. Anything missed still compiles in three of the four;
 * the guard exists to catch "Save"/"New"/"Class"-shaped collisions.
 */
const COMMON = ['page', 'class', 'new', 'return', 'if', 'else', 'for', 'while', 'try', 'true', 'false', 'null', 'this'];

const RESERVED: Record<Language, ReadonlySet<string>> = {
  javascript: new Set([
    ...COMMON, 'break', 'case', 'catch', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
    'enum', 'export', 'extends', 'finally', 'function', 'import', 'in', 'instanceof', 'super',
    'switch', 'throw', 'typeof', 'var', 'void', 'with', 'yield', 'constructor', 'toString', 'valueOf',
  ]),
  python: new Set([
    ...COMMON, 'and', 'as', 'assert', 'async', 'await', 'break', 'continue', 'def', 'del', 'elif',
    'except', 'finally', 'from', 'global', 'import', 'in', 'is', 'lambda', 'none', 'nonlocal', 'not',
    'or', 'pass', 'raise', 'with', 'yield', 'self',
  ]),
  java: new Set([
    ...COMMON, 'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'const',
    'continue', 'default', 'do', 'double', 'enum', 'extends', 'final', 'finally', 'float', 'goto',
    'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'package', 'private',
    'protected', 'public', 'short', 'static', 'super', 'switch', 'throw', 'throws', 'transient',
    'void', 'volatile',
  ]),
  csharp: new Set([
    ...COMMON, 'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked',
    'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'enum', 'event',
    'explicit', 'extern', 'finally', 'fixed', 'float', 'foreach', 'goto', 'implicit', 'in', 'int',
    'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'object', 'operator', 'out',
    'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'sbyte', 'sealed',
    'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 'throw', 'typeof',
    'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'volatile',
  ]),
};

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
 * A property name for one picked element, in the language's own casing:
 * camelCase for JS and Java, snake_case for Python, PascalCase for C#. Suffixed
 * by role, never reserved, never empty.
 */
export function propertyName(
  entry: Pick<SessionEntry, 'accessibleName' | 'role'>,
  language: Language = 'javascript',
): string {
  const words = splitWords(entry.accessibleName);

  // With no accessible name there is nothing for a role suffix to qualify, so the
  // role becomes the whole name ("dialog", not "Dialog").
  if (words.length === 0) {
    const fallback = splitWords(entry.role ?? '');
    return guard(fallback.length > 0 ? fallback : ['element'], language);
  }

  const suffix = entry.role ? (ROLE_SUFFIX[entry.role] ?? '') : '';
  // Don't duplicate a suffix the name already ends with ("Save Button" -> saveButton).
  const duplicated = suffix.length > 0 && words.join('').endsWith(suffix.toLowerCase());

  return guard(suffix && !duplicated ? [...words, suffix] : words, language);
}

/** Assign each entry a unique property name, suffixing duplicates with 2, 3, … */
export function withUniqueNames(
  entries: SessionEntry[],
  language: Language = 'javascript',
): SessionEntry[] {
  const used = new Map<string, number>();

  return entries.map((entry) => {
    const base = propertyName(entry, language);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return { ...entry, name: seen === 0 ? base : `${base}${seen + 1}` };
  });
}

/** `Customer Details` / `customer-details.page.ts` -> `CustomerDetailsPage`. */
export function className(pageName: string): string {
  const pascal = pageName
    .replace(/\.(page\.ts|page\.js|py|java|cs)$/i, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const name = pascal || 'Untitled';
  return name.endsWith('Page') ? name : `${name}Page`;
}

/** The file each language would keep the class in, e.g. `customer-details.page.ts`. */
export function fileName(pageName: string, language: Language = 'javascript'): string {
  const cls = className(pageName);

  switch (language) {
    // Java and C# require (Java) or expect (C#) the file to be named for the class.
    case 'java':
      return `${cls}.java`;
    case 'csharp':
      return `${cls}.cs`;
    case 'python':
      return `${snake(cls)}.py`;
    default:
      return `${cls.replace(/Page$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}.page.ts`;
  }
}

/** Render the page-object source for a session. */
export function generatePageObject(
  pageName: string,
  entries: SessionEntry[],
  language: Language = 'javascript',
): string {
  return EMITTERS[language](className(pageName), withUniqueNames(entries, language));
}

/**
 * Case the words for `language`, appending "locator" first if the result would
 * shadow a reserved word or the injected page. Disambiguating before casing is
 * what keeps `class` -> `class_locator` in Python rather than `classLocator`.
 */
function guard(words: string[], language: Language): string {
  const collides = RESERVED[language].has(words.join('').toLowerCase());
  return cased(collides ? [...words, 'locator'] : words, language);
}

/**
 * Break a human string into lowercase words. Long accessible names make
 * unreadable identifiers, so four words is the ceiling.
 */
function splitWords(value: string): string[] {
  return value
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+|(?<=[a-z0-9])(?=[A-Z])/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.toLowerCase());
}

/** Join words the way `language` names a member, guarding against a leading digit. */
function cased(words: string[], language: Language): string {
  const parts = words.map((word) => word.toLowerCase());
  const name =
    language === 'python'
      ? parts.join('_')
      : parts
          .map((word, index) =>
            index === 0 && language !== 'csharp' ? word : word.charAt(0).toUpperCase() + word.slice(1),
          )
          .join('');

  // Identifiers cannot start with a digit.
  return /^\d/.test(name) ? `n${name}` : name;
}

function snake(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}
