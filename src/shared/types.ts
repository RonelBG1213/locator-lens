/** Domain types shared by the content script, the side panel and the tests. */

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
  /** JS locator source, e.g. `getByRole('button', { name: 'Save' })`. */
  locator: string;
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
  boundingBox: { x: number; y: number; width: number; height: number } | null;
}

/** Non-Playwright selector forms, for pasting into DevTools or other tools. */
export interface RawSelectors {
  css: string;
  xpath: string;
}

/**
 * One `frameLocator(...)` hop, outermost first. Empty for elements in the top
 * document. Built by walking up the frame tree in content/frames.ts.
 */
export interface FrameHop {
  /** Selector for the owning <iframe> element, in its parent document. */
  selector: string;
  /** JS source for that hop, e.g. `frameLocator('#modal')`. */
  locator: string;
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

/** Result of evaluating a user-typed selector in the live editor. */
export interface EvaluationResult {
  selector: string;
  /** null when the selector failed to parse. */
  matchCount: number | null;
  /** Parse or resolution error, shown inline in the editor. */
  error: string | null;
  /** Short previews of the first few matches, e.g. `<button>Save</button>`. */
  previews: string[];
  /** True when matchCount > 1 — Playwright would throw in strict mode. */
  strictViolation: boolean;
}

/** One element captured into the multi-pick session, for POM export. */
export interface SessionEntry {
  /** camelCase property name, unique within the session. */
  name: string;
  locator: string;
  role: string | null;
  accessibleName: string;
}

export interface Settings {
  /** Feeds Playwright's engine; must match `use.testIdAttribute` in your config. */
  testIdAttributeName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  testIdAttributeName: 'data-testid',
};
