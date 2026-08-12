/**
 * The page-object class template for each language.
 *
 * Every emitter takes an already-resolved class name and entries whose `name` is
 * already unique and already cased for that language — see core/pom.ts. Entries
 * carry the locator chain WITHOUT its root receiver, because each language holds
 * the page under a different name (`this.page`, `self.page`, `_page`).
 *
 * None of this is compiled by CI, so the inline snapshots in tests/unit/pom.spec.ts
 * are the only review gate. Change a template, read the snapshot.
 */
import type { Language, SessionEntry } from '../shared/types.js';

type Emitter = (cls: string, entries: SessionEntry[]) => string;

export const EMITTERS: Record<Language, Emitter> = {
  javascript: typescript,
  python,
  java,
  csharp,
};

function typescript(cls: string, entries: SessionEntry[]): string {
  const properties = entries.map(
    (entry) =>
      `${docComment(entry, '  /** ', ' */')}  readonly ${entry.name} = this.page.${entry.locators.javascript};`,
  );

  return join([
    `import type { Page } from '@playwright/test';`,
    ``,
    `export class ${cls} {`,
    ...(properties.length > 0 ? [properties.join('\n'), ``] : []),
    `  constructor(private readonly page: Page) {}`,
    `}`,
  ]);
}

function python(cls: string, entries: SessionEntry[]): string {
  const properties = entries.map(
    (entry) =>
      `${docComment(entry, '        # ', '')}        self.${entry.name} = page.${entry.locators.python}`,
  );

  return join([
    `from playwright.sync_api import Page`,
    ``,
    ``,
    `class ${cls}:`,
    `    def __init__(self, page: Page) -> None:`,
    `        self.page = page`,
    ...properties,
  ]);
}

/**
 * Java declares the fields and assigns them in the constructor: `page` is not in
 * scope at field-initialiser time, so the one-liner the other languages use is
 * not available here.
 */
function java(cls: string, entries: SessionEntry[]): string {
  const fields = entries.map(
    (entry) => `${docComment(entry, '  /** ', ' */')}  public final Locator ${entry.name};`,
  );
  const assignments = entries.map(
    (entry) => `    this.${entry.name} = page.${entry.locators.java};`,
  );

  // Java is the one language here whose imports depend on what was generated:
  // a pick inside an iframe names FrameLocator in its options class, and
  // getByRole names AriaRole. Importing either unconditionally leaves an unused
  // import, which some builds treat as an error.
  const body = assignments.join('\n');
  const imports = [
    `import com.microsoft.playwright.Locator;`,
    ...(body.includes('FrameLocator.') ? [`import com.microsoft.playwright.FrameLocator;`] : []),
    `import com.microsoft.playwright.Page;`,
    ...(body.includes('AriaRole.') ? [`import com.microsoft.playwright.options.AriaRole;`] : []),
  ];

  return join([
    ...imports.sort(),
    ``,
    `public class ${cls} {`,
    `  private final Page page;`,
    ...(fields.length > 0 ? [``, fields.join('\n')] : []),
    ``,
    `  public ${cls}(Page page) {`,
    `    this.page = page;`,
    ...assignments,
    `  }`,
    `}`,
  ]);
}

/**
 * C# uses expression-bodied properties rather than constructor assignment, which
 * is the idiom in Playwright's own .NET page-object samples and re-resolves the
 * locator on each access.
 */
function csharp(cls: string, entries: SessionEntry[]): string {
  const properties = entries.map(
    (entry) =>
      `${docComment(entry, '    /// <summary>', '</summary>', xml)}    public ILocator ${entry.name} => _page.${entry.locators.csharp};`,
  );

  return join([
    `using Microsoft.Playwright;`,
    ``,
    `public class ${cls}`,
    `{`,
    `    private readonly IPage _page;`,
    ``,
    `    public ${cls}(IPage page)`,
    `    {`,
    `        _page = page;`,
    `    }`,
    ...(properties.length > 0 ? [``, properties.join('\n')] : []),
    `}`,
  ]);
}

/**
 * `role: Accessible Name` above the property, in the comment syntax given.
 * Returns "" — not a blank line — when there is no accessible name to describe.
 *
 * An accessible name is attacker-adjacent text: it comes from the page. Newlines
 * would end a line comment and spill the rest onto the property as code, and the
 * closing delimiter would do the same to a block comment, so both go.
 */
function docComment(
  entry: SessionEntry,
  open: string,
  close: string,
  escape: (text: string) => string = (text) => text,
): string {
  if (!entry.accessibleName) return '';

  const text = `${entry.role ?? 'element'}: ${entry.accessibleName}`.replace(/[\r\n]+/g, ' ');
  const safe = escape(close ? text.split(close.trim()).join('') : text);

  return `${open}${safe}${close}\n`;
}

/** C# doc comments are XML, so a stray `<` in a name is a malformed tag. */
function xml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Trailing newline: every one of these files is expected to end with one. */
function join(lines: string[]): string {
  return `${lines.join('\n')}\n`;
}
