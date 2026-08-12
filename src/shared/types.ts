/** Domain types shared by the content script, the side panel and the tests. */

/**
 * A Playwright client language. These are the exact keys Playwright's own
 * `asLocator` and locator parser accept — see `generators` in the vendored
 * engine — so they must not be renamed to something prettier.
 */
export type Language = 'javascript' | 'python' | 'java' | 'csharp';

/** Dropdown order and labels. `javascript` covers TypeScript, which shares the API. */
export const LANGUAGES: ReadonlyArray<{ id: Language; label: string }> = [
  { id: 'javascript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'csharp', label: 'C#' },
];

export function languageLabel(language: Language): string {
  return LANGUAGES.find((entry) => entry.id === language)?.label ?? language;
}

/**
 * One rendering per language of the same locator.
 *
 * Every language is rendered up front, at pick time, because only the content
 * script has the engine — the side panel deliberately never loads it. Switching
 * the dropdown is then a pure re-render with no round trip, and keeps working
 * after the page has navigated away from the element that was picked.
 */
export type LocatorSources = Record<Language, string>;

/** A rectangle in CSS pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How a locator identifies its element. Drives base scoring in core/rank.ts. */
export type LocatorKind =
  | 'role'
  | 'label'
  | 'placeholder'
  | 'alt'
  | 'title'
  | 'testid'
  | 'text'
  | 'css'
  | 'other';

/** A reason a candidate lost points, surfaced verbatim in the panel. */
export interface Penalty {
  /** Stable id from core/rules.ts, e.g. 'nth-index'. */
  id: string;
  /** Human-readable explanation shown next to the candidate. */
  reason: string;
  /** Positive number subtracted from the score. */
  cost: number;
}

/** One ranked locator suggestion for the picked element. */
export interface Candidate {
  /** Playwright-internal selector, e.g. `internal:role=button[name="Save"i]`. */
  selector: string;
  /** Locator source per language, e.g. `getByRole('button', { name: 'Save' })`. */
  locators: LocatorSources;
  kind: LocatorKind;
  /** How many elements this selector resolves to, per Playwright's own engine. */
  matchCount: number;
  /** 0-100. Higher is more reliable. */
  score: number;
  penalties: Penalty[];
  /** True when this is the selector Playwright's own codegen would emit. */
  isCodegenDefault: boolean;
}

/** Everything the Inspector pane shows about the picked element. */
export interface ElementInfo {
  tagName: string;
  role: string | null;
  accessibleName: string;
  accessibleDescription: string;
  text: string;
  attributes: Array<{ name: string; value: string }>;
  visible: boolean;
  enabled: boolean;
  editable: boolean;
  checked: boolean | 'mixed' | null;
  /** Outermost-first breadcrumb of ancestors, e.g. ['body', 'form#login', 'div.row']. */
  ancestry: string[];
  /** Frame-local, and only true at pick time — screenshots re-measure, see CaptureGeometry. */
  boundingBox: Rect | null;
}

/** Non-Playwright selector forms, for pasting into DevTools or other tools. */
export interface RawSelectors {
  /** Absolute path from the document root, or the nearest usable id. */
  css: string;
  xpath: string;
  /**
   * The same element expressed relative to its nearest uniquely identifiable
   * neighbour, using CSS combinators and XPath axes. Null when no anchor was
   * found within range — see core/axisSelectors.ts for the bounds.
   */
  axisCss: string | null;
  axisXpath: string | null;
  /** Human-readable anchor, e.g. `#gallery, 2 levels up`. Null when there is none. */
  anchor: string | null;
}

/**
 * One `frameLocator(...)` hop, outermost first. Empty for elements in the top
 * document. Built by walking up the frame tree in content/frames.ts.
 */
export interface FrameHop {
  /** Selector for the owning <iframe> element, in its parent document. */
  selector: string;
  /** Source for that hop per language, e.g. `frameLocator("#modal")`. */
  locators: LocatorSources;
}

/**
 * Set when the suggested locator resolves to something other than the element
 * that was clicked.
 *
 * Playwright deliberately does this for elements you cannot interact with
 * directly — clicking an <option> yields a locator for the enclosing <select>,
 * because the way to drive it is `selectOption()`. That is good advice, but the
 * panel must say so rather than implying the locator points at the click target.
 */
export interface Retarget {
  tagName: string;
  role: string | null;
  /** True when the resolved element encloses the clicked one. */
  isAncestor: boolean;
  note: string;
}

/** A completed pick, sent from the content script to the side panel. */
export interface PickResult {
  candidates: Candidate[];
  info: ElementInfo;
  raw: RawSelectors;
  frameChain: FrameHop[];
  /** Set when the frame chain could not be resolved (cross-origin parent). */
  frameChainWarning?: string;
  /** Set when the top candidate does not resolve to the clicked element. */
  retarget?: Retarget;
}

/** What one frame found when it evaluated the selector against its own document. */
export interface FrameEvaluation {
  /** Hops from the top document down to this frame. Empty for the main frame. */
  frameChain: FrameHop[];
  matchCount: number;
  /** Short previews of the first few matches, e.g. `<button>Save</button>`. */
  previews: string[];
  /**
   * True for the frame the user's expression actually addresses — the main frame
   * for a bare selector, or the frame reached by its frameLocator() hops.
   */
  isTarget: boolean;
  /** Engine error resolving the selector here. Distinct from zero matches. */
  error: string | null;
}

/**
 * Result of evaluating a user-typed selector in the live editor.
 *
 * Deliberately NOT a single total. `page.getByRole(...)` does not search iframes
 * in real Playwright, so summing matches across frames would report a number no
 * test could reproduce. Instead the frame the user addressed is authoritative,
 * and matches elsewhere are listed separately with the prefix they would need.
 */
export interface EvaluationResult {
  /** Exactly what the user typed. */
  input: string;
  /** Resolved bare selector for the target frame; null when parsing failed. */
  selector: string | null;
  /** Parse error, shown inline in the editor. */
  error: string | null;
  /** The addressed frame's result. Null on a parse error or unreachable frame. */
  target: FrameEvaluation | null;
  /** Frames that also match but need a different frameLocator() prefix. */
  otherFrames: FrameEvaluation[];
  /** True when the target frame has more than one match. */
  strictViolation: boolean;
  /** Frames that did not answer before the collection deadline. */
  unreachableFrames: number;
}

/** What a screenshot is a picture of. */
export type CaptureTarget = 'element' | 'viewport';

/**
 * Everything the panel needs to turn a visible-tab capture into the requested
 * picture, measured in the page at the moment of capture.
 */
export interface CaptureGeometry {
  /**
   * What to crop to, in TOP-document viewport coordinates. A pick three iframes
   * deep has each ancestor frame's offset already folded in.
   */
  rect: Rect;
  /**
   * The top frame's CSS viewport. Divided into the captured image's pixel width
   * this gives the capture scale, which is the only reliable way to learn it —
   * devicePixelRatio and page zoom both feed into it and can disagree.
   */
  viewport: { width: number; height: number };
  /**
   * Box to mark on the finished image, same coordinate space as `rect`. Only
   * ever set for a viewport shot, where the point is to say which element in the
   * picture is the one being talked about. Null when nothing is picked, or when
   * the pick is scrolled outside the shot.
   */
  highlight?: Rect | null;
}

/**
 * Answer to PSP_CAPTURE_BEGIN. Failure is a value, not an exception: "the
 * element scrolled out of existence" is an ordinary thing for the panel to say.
 */
export type CaptureStart =
  | { ok: true; geometry: CaptureGeometry }
  | { ok: false; error: string };

/** One element captured into the multi-pick session, for POM export. */
export interface SessionEntry {
  /**
   * Property name, unique within the session. Left empty when collected — the
   * convention is per language (camelCase, snake_case, PascalCase), so the name
   * is settled by withUniqueNames() at render time, not at pick time.
   */
  name: string;
  /**
   * The locator chain WITHOUT its root receiver, per language, e.g.
   * `frame_locator("#modal").get_by_role("button", name="Save")`. Root-less
   * because each language's page object holds the page under a different name.
   */
  locators: LocatorSources;
  role: string | null;
  accessibleName: string;
}

export interface Settings {
  /** Feeds Playwright's engine; must match `use.testIdAttribute` in your config. */
  testIdAttributeName: string;
  /** Which client language the panel renders locators and page objects in. */
  language: Language;
}

export const DEFAULT_SETTINGS: Settings = {
  testIdAttributeName: 'data-testid',
  language: 'javascript',
};
