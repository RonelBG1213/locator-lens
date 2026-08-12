/**
 * Scores and orders the candidate locators.
 *
 * Pure — takes raw candidates in, returns ranked ones out — so it is unit tested
 * without a browser (tests/unit/rank.spec.ts).
 *
 * Uniqueness dominates everything. A CSS path that resolves to exactly one
 * element is more useful than a beautiful getByRole that resolves to six and
 * would throw under Playwright's strict mode.
 */
import { DEFAULT_RULES, KIND_SCORE, type Rule } from './rules.js';
import type { Candidate, LocatorSources, Penalty } from '../shared/types.js';

/** Shape rank() needs; matches engine/generate.ts RawCandidate. */
export interface RankInput {
  selector: string;
  locators: LocatorSources;
  kind: Candidate['kind'];
  matchCount: number;
  isCodegenDefault: boolean;
}

/** Applied when a selector resolves to nothing — it is unusable. */
const NO_MATCH_PENALTY: Penalty = {
  id: 'no-match',
  reason: 'Resolves to no elements — unusable',
  cost: 100,
};

/** Applied per extra match; Playwright's strict mode rejects anything above one. */
const AMBIGUOUS_PENALTY = (count: number): Penalty => ({
  id: 'ambiguous',
  reason: `Resolves to ${count} elements — Playwright strict mode would throw`,
  cost: 60,
});

/**
 * Ordering tier. Kept structural rather than folded into the score so that
 * uniqueness genuinely dominates: no amount of elegance promotes a locator that
 * Playwright's strict mode would reject above one that actually resolves.
 */
function tier(candidate: Candidate): number {
  if (candidate.matchCount === 1) return 0;
  if (candidate.matchCount > 1) return 1;
  return 2; // matches nothing
}

export function rank(candidates: RankInput[], rules: Rule[] = DEFAULT_RULES): Candidate[] {
  return candidates
    .map((candidate) => score(candidate, rules))
    .sort(
      (a, b) =>
        tier(a) - tier(b) ||
        b.score - a.score ||
        // Tie-break toward what codegen would emit, then toward the shorter locator.
        // Always measured in JavaScript: the ranking must not shuffle itself when
        // the user changes the language dropdown.
        Number(b.isCodegenDefault) - Number(a.isCodegenDefault) ||
        a.locators.javascript.length - b.locators.javascript.length,
    );
}

function score(candidate: RankInput, rules: Rule[]): Candidate {
  const penalties: Penalty[] = [];

  if (candidate.matchCount === 0) penalties.push(NO_MATCH_PENALTY);
  else if (candidate.matchCount > 1) penalties.push(AMBIGUOUS_PENALTY(candidate.matchCount));

  for (const rule of rules) {
    if (rule.test(candidate.selector))
      penalties.push({ id: rule.id, reason: rule.reason, cost: rule.cost });
  }

  const base = KIND_SCORE[candidate.kind];
  const deductions = penalties.reduce((total, penalty) => total + penalty.cost, 0);

  return {
    selector: candidate.selector,
    locators: candidate.locators,
    kind: candidate.kind,
    matchCount: candidate.matchCount,
    score: clamp(base - deductions),
    penalties,
    isCodegenDefault: candidate.isCodegenDefault,
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Bucket a score for the panel's colour coding. */
export function grade(score: number): 'strong' | 'fair' | 'weak' {
  if (score >= 75) return 'strong';
  if (score >= 45) return 'fair';
  return 'weak';
}
