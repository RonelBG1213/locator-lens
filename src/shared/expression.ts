/**
 * Renders a pick as the expression you paste into a test, in any of the four
 * Playwright client languages.
 *
 * Pure and dependency-free so both the content script and the side panel can use
 * it — the panel must never pull in the 300KB engine bundle. That is also why the
 * per-language locator strings arrive pre-rendered on the pick (see
 * LocatorSources) rather than being generated here.
 */
import { LANGUAGES, type FrameHop, type Language, type LocatorSources } from './types.js';

/** What the chain hangs off. C# capitalises its page property; the rest do not. */
const ROOT: Record<Language, string> = {
  javascript: 'page',
  python: 'page',
  java: 'page',
  csharp: 'Page',
};

/** The frameLocator method, spelled each language's way. */
const FRAME_LOCATOR: Record<Language, string> = {
  javascript: 'frameLocator',
  python: 'frame_locator',
  java: 'frameLocator',
  csharp: 'FrameLocator',
};

/**
 * The hop into a child frame, in every language.
 *
 * Hand-built rather than routed through Playwright's `asLocator`: handing the
 * engine a selector containing `internal:control=enter-frame` yields the
 * `locator("#modal").contentFrame()` form instead, which is a different — and for
 * this panel's purpose, less useful — way of saying the same thing.
 *
 * JSON.stringify is the right quoting for all four: every one of them takes
 * double-quoted strings with backslash escapes.
 */
export function frameHopLocators(selector: string): LocatorSources {
  const quoted = JSON.stringify(selector);
  return Object.fromEntries(
    LANGUAGES.map(({ id }) => [id, `${FRAME_LOCATOR[id]}(${quoted})`]),
  ) as LocatorSources;
}

/**
 * The chain WITHOUT its root receiver, e.g.
 * `frame_locator("#modal").get_by_role("button", name="Save")`.
 *
 * Page objects need this form because each language holds the page under a
 * different name (`this.page`, `self.page`, `_page`).
 */
export function chainExpression(
  frameChain: FrameHop[],
  locators: LocatorSources,
  language: Language,
): string {
  return [...frameChain.map((hop) => hop.locators[language]), locators[language]].join('.');
}

/** e.g. `page.frameLocator("#modal").getByRole('button', { name: 'Save' })` */
export function pageExpression(
  frameChain: FrameHop[],
  locators: LocatorSources,
  language: Language,
): string {
  return `${ROOT[language]}.${chainExpression(frameChain, locators, language)}`;
}

/** The receiver a bare expression hangs off, for placeholders and hints. */
export function rootName(language: Language): string {
  return ROOT[language];
}

/** Bare method name, for prose that names it — e.g. "the frame_locator() prefix". */
export function frameLocatorName(language: Language): string {
  return FRAME_LOCATOR[language];
}
