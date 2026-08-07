/**
 * Reliability rules, expressed as data.
 *
 * Kept as a table rather than branching code for two reasons: the panel shows
 * each rule's `reason` verbatim so the score is explainable, and an app-specific
 * ruleset (Oracle APEX being the obvious one — engine ids like `#B48291736`,
 * Universal Theme classes like `.t-Button--hot`) can later be appended to
 * DEFAULT_RULES without touching the scoring algorithm.
 */
import type { LocatorKind } from '../shared/types.js';

/** Base score by locator kind, mirroring the team's locator priority order. */
export const KIND_SCORE: Record<LocatorKind, number> = {
  role: 100,
  label: 95,
  placeholder: 85,
  testid: 80,
  alt: 70,
  title: 60,
  text: 50,
  other: 40,
  css: 25,
};

/** Why a kind scores where it does — shown as the candidate's subtitle. */
export const KIND_RATIONALE: Record<LocatorKind, string> = {
  role: 'Role + accessible name: survives markup and styling changes',
  label: 'Label association: stable as long as the visible label is stable',
  placeholder: 'Placeholder text: stable, but often changes with copy edits',
  testid: 'Test id: stable by contract, if the team maintains it',
  alt: 'Alt text: stable for images with meaningful alt attributes',
  title: 'Title attribute: rarely a deliberate contract',
  text: 'Text content: fine for assertions, brittle for interaction',
  other: 'Internal Playwright selector',
  css: 'CSS path: couples the test to DOM structure and styling',
};

export interface Rule {
  id: string;
  reason: string;
  cost: number;
  /** True when the rule applies to this selector. */
  test: (selector: string) => boolean;
}

/** Matches ids that look machine-generated rather than authored. */
const GENERATED_ID = /#[A-Za-z_-]{0,4}\d{5,}\b/;
/** Long hex/uuid-ish fragments, e.g. CSS-module hashes. */
const HASH_LIKE = /[#.][A-Za-z_-]*[a-f0-9]{8,}\b/;
/** Numbers, dates, currency inside a text/name match — usually dynamic data. */
const DYNAMIC_TEXT = /(name=|text=)["'][^"']*(\d{2,}|\d{1,2}\/\d{1,2}|[$€£]\s?\d)/i;
/** Class names that read as presentational rather than semantic. */
const STYLING_CLASS =
  /\.(is-|has-|js-|u-|t-|a-)?[a-z-]*(active|hover|primary|secondary|hot|danger|warning|success|large|small|col-\d|row-\d|mt-\d|mb-\d|px-\d|py-\d)\b/i;

export const DEFAULT_RULES: Rule[] = [
  {
    id: 'nth-index',
    reason: 'Uses a positional index — breaks when sibling order or count changes',
    cost: 45,
    test: (s) => /\bnth=|:nth-child|:nth-of-type|>> nth=/.test(s),
  },
  {
    id: 'generated-id',
    reason: 'Targets a machine-generated id — regenerates between builds or sessions',
    cost: 40,
    test: (s) => GENERATED_ID.test(s),
  },
  {
    id: 'hash-class',
    reason: 'Targets a hashed class or id — changes on every rebuild',
    cost: 40,
    test: (s) => HASH_LIKE.test(s),
  },
  {
    id: 'styling-class',
    reason: 'Couples to a styling class — changes when the design does, not the behaviour',
    cost: 25,
    test: (s) => STYLING_CLASS.test(s),
  },
  {
    id: 'dynamic-text',
    reason: 'Matches text containing numbers or dates — likely to differ per run',
    cost: 20,
    test: (s) => DYNAMIC_TEXT.test(s),
  },
  {
    id: 'deep-chain',
    reason: 'Chains four or more parts — sensitive to intermediate DOM changes',
    cost: 15,
    test: (s) => s.split('>>').length >= 4,
  },
  {
    id: 'long-text',
    reason: 'Matches a long text string — whitespace or copy edits will break it',
    cost: 10,
    test: (s) => /(name=|text=)["'][^"']{60,}/.test(s),
  },
];
