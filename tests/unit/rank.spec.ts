/**
 * Ranking is pure, so it is tested without a browser. The engine's real output
 * for these selectors is verified separately in tests/e2e/roundtrip.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import { grade, rank, type RankInput } from '../../src/core/rank.js';
import { sources, uniform } from './support.js';

/** A unique, clean role-based candidate — the shape everything else is compared to. */
function candidate(overrides: Partial<RankInput> = {}): RankInput {
  return {
    selector: 'internal:role=button[name="Save"i]',
    locators: sources(),
    kind: 'role',
    matchCount: 1,
    isCodegenDefault: true,
    ...overrides,
  };
}

describe('rank', () => {
  it('prefers a role locator over a CSS path for the same element', () => {
    const [best] = rank([
      candidate({ kind: 'css', selector: 'div > button', isCodegenDefault: false }),
      candidate(),
    ]);
    expect(best?.kind).toBe('role');
  });

  it('ranks a unique CSS path above an ambiguous role locator', () => {
    // Uniqueness beats elegance: a locator that throws in strict mode is useless.
    const [best] = rank([
      candidate({ matchCount: 6 }),
      candidate({
        kind: 'css',
        selector: '#row-one > button',
        locators: uniform("locator('#row-one > button')"),
        matchCount: 1,
        isCodegenDefault: false,
      }),
    ]);
    expect(best?.kind).toBe('css');
    expect(best?.matchCount).toBe(1);
  });

  it('reports ambiguity as an explicit penalty naming the match count', () => {
    const [scored] = rank([candidate({ matchCount: 3 })]);
    expect(scored?.penalties.map((p) => p.id)).toContain('ambiguous');
    expect(scored?.penalties.find((p) => p.id === 'ambiguous')?.reason).toContain('3 elements');
  });

  it('scores a selector that matches nothing at zero', () => {
    const [scored] = rank([candidate({ matchCount: 0 })]);
    expect(scored?.score).toBe(0);
  });

  it.each([
    ['nth-index', 'internal:role=button >> nth=2'],
    ['generated-id', '#B48291736'],
    ['hash-class', '.css-1a2b3c4d5e'],
    ['styling-class', '.t-Button--hot'],
    ['dynamic-text', 'internal:text="Order #10093"i'],
    ['deep-chain', 'a >> b >> c >> internal:role=button'],
  ])('flags %s', (ruleId, selector) => {
    const [scored] = rank([candidate({ selector, isCodegenDefault: false })]);
    expect(scored?.penalties.map((p) => p.id)).toContain(ruleId);
  });

  it('leaves a clean unique role locator unpenalised at full score', () => {
    const [scored] = rank([candidate()]);
    expect(scored?.penalties).toEqual([]);
    expect(scored?.score).toBe(100);
  });

  it('breaks score ties in favour of the codegen default', () => {
    const [best] = rank([
      candidate({ selector: 'internal:role=button[name="A"i]', isCodegenDefault: false }),
      candidate({ selector: 'internal:role=button[name="B"i]', isCodegenDefault: true }),
    ]);
    expect(best?.isCodegenDefault).toBe(true);
  });

  it('never returns a score outside 0-100', () => {
    const scored = rank([
      candidate({ kind: 'css', selector: '#B48291736 >> a >> b >> c >> nth=3', matchCount: 0 }),
      candidate(),
    ]);
    for (const item of scored) {
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
    }
  });
});

describe('grade', () => {
  it.each([
    [100, 'strong'],
    [75, 'strong'],
    [74, 'fair'],
    [45, 'fair'],
    [44, 'weak'],
    [0, 'weak'],
  ])('grades %i as %s', (score, expected) => {
    expect(grade(score)).toBe(expected);
  });
});
