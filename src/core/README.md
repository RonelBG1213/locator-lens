# src/core

Pure logic — ranking, the rules table, selector text, crop geometry, shadow
boundaries. No DOM, no engine instance, no extension APIs.

**Boundary:** may import `src/shared/` and, in exactly one file, the isomorphic
vendored parser. Must not import `src/engine/`, `src/content/`, `src/sidepanel/`,
or call `chrome.*`. That purity is not decorative — it is what lets
`tests/unit/` run this folder in plain Node with no browser.

## Files

| File | Role | Key exports |
| --- | --- | --- |
| `rank.ts` | Scores and orders candidates; uniqueness dominates | `rank()`, `grade()` |
| `rules.ts` | Base scores and deductions, expressed as data | `DEFAULT_RULES`, `KIND_SCORE`, `KIND_RATIONALE` |
| `rawSelectors.ts` | Absolute CSS / XPath reference forms | `toCssPath()`, `toXPath()`, `isAnchorId()` |
| `axisSelectors.ts` | Anchored CSS / XPath, relative to a nearby named element | `toAxisSelectors()` |
| `locatorInput.ts` | Parses what the user types into the live editor | `parseLocatorInput()`, `stripPagePrefix()` |
| `crop.ts` | Crop arithmetic for element screenshots | `cropRegion()`, `highlightRect()` |
| `shadow.ts` | Where an element sits relative to shadow boundaries | `shadowContext()`, `shadowHostOf()` |

## Invariants

- **`rank()` tiers by match count before comparing scores.** One match, then many,
  then none. A unit test caught an ambiguous `getByRole` (100−60) outranking a
  unique CSS path (25) — no penalty weighting expresses "always", tiering does.
  No rule you add can promote a locator strict mode would reject.
- **`rules.ts` stays a data table, not branching code.** The panel prints each
  rule's `reason` verbatim, and an app-specific ruleset (APEX being the obvious
  one) has to be appendable without touching the algorithm.
- **The anchored search is bounded — five ancestors up, five siblings each way.**
  Past that a "relationship" is a coincidence of layout. Emitting nothing is the
  correct outcome; emitting a long path is not.
- **CSS and XPath do not pierce shadow roots.** They are native document queries.
  Callers must consult `shadowContext()` and suppress the reference form rather
  than hand over a path that silently resolves to nothing.
- **Crop scale is measured, never derived.** `cropRegion()` divides image width by
  the top frame's `innerWidth` instead of multiplying DPR by zoom — those two
  disagree often enough (fractional zoom, per-tab zoom, a window dragged between
  monitors) to matter. `innerWidth` specifically: the classic scrollbar is inside
  it and inside the photo, but outside `clientWidth`.

## The one vendored import

`locatorInput.ts` imports `../vendor/locatorParser.generated.js`, and it is the
**only** file in the repo that may. That parser is ordinary isomorphic CJS — no
DOM — which is exactly why the live editor's parsing is unit-testable. The
browser-only injected script is a different thing and belongs to
[`src/engine/`](../engine/README.md).

Two hard-won cases live behind `parseLocatorInput()`, both with regression tests
in `locatorInput.spec.ts`:

- `page.` is not valid input to Playwright's parser — it returns `""`. Hence
  `stripPagePrefix()`, without which the panel could not evaluate its own copy
  output.
- **Parse success is not resolvability.** `internal:role=` parses fine and throws
  at query time. Reporting that as "0 matches" blames the page for a bad
  selector, so it is surfaced as a distinct error.

## Changing this folder

- Adding a deduction → append to `DEFAULT_RULES`, add a case to `rank.spec.ts`.
  Nothing else changes.
- Touching `rank.ts` tie-breaks → the round-trip e2e test is the real gate, not
  the unit test.
- Adding a file → add a row above, or `npm run check:docs` fails.
- Reaching for `chrome.*` or the engine here → it belongs in `content/` or
  `sidepanel/` instead. The import would also break the unit suite.

## Tests

`tests/unit/rank.spec.ts` · `crop.spec.ts` · `locatorInput.spec.ts` — all in
plain Node, no browser. `axisSelectors.ts` and `rawSelectors.ts` are covered
indirectly by `tests/e2e/roundtrip.spec.ts`, which needs a real DOM.
