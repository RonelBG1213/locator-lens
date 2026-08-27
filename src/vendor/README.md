# src/vendor

> ## ⚠ Generated. Do not edit by hand.
>
> Every file here is produced by `npm run vendor` and overwritten without warning.
> A fix made here is lost on the next engine upgrade and, worse, silently diverges
> from Playwright — which is the one failure this project exists to prevent.
> Change `scripts/vendor-playwright-engine.mjs` instead.

Playwright's own selector engine, extracted from `playwright-core` at build time.
**Committed on purpose:** a fresh clone builds without a `playwright-core`
install, and an engine change shows up as a reviewable diff instead of appearing
silently in `dist/`.

## Contents

Two pieces, extracted differently, each with exactly one importer.

| File | What it is | Sole importer |
| --- | --- | --- |
| `injectedScript.generated.js` / `.d.ts` | Generate, query, ARIA. Shipped by Playwright as a *string*; wrapped into an ES module at build time | `engine/bootstrap.ts` |
| `locatorParser.generated.js` / `.d.ts` | Locator parsing and frame splitting. Ordinary isomorphic CJS — runs in plain Node | `core/locatorInput.ts` |

That second row is why `core/locatorInput.ts` can be unit tested without a
browser, and why `core/` is allowed one vendored import despite being otherwise
engine-free.

## Why this exists at all

The alternative is re-implementing ARIA role and accessible-name computation —
roughly a thousand lines that *will* drift on `aria-labelledby`, label
association, and alt/title fallbacks. A picker whose "verified unique" selector
then fails in the actual test is worse than no picker. Vendoring buys exact
parity: the suggestion is literally what `codegen` emits, and match counts come
from Playwright's own resolver.

The price is a pinned, non-semver internal dependency. Paid deliberately.

## Version lock

Pinned to **1.58.2** exactly, in both `playwright-core` and `@playwright/test`.
They must move **together** — bumping one alone does not error, it just nests a
second `playwright-core` under `@playwright/test`, so the new engine ends up
validated by the old runner. `tests/e2e/engine.spec.ts` asserts the pins are
equal.

```bash
npm run vendor:upgrade -- 1.59.0    # or: -- latest
```

**Known layout change:** `playwright-core` ≤ 1.61 ships the bundle at
`lib/generated/injectedScriptSource.js`; 1.62+ folds it into `lib/coreBundle.js`.
The extractor handles both, but the 1.62+ path is a string-literal extraction and
is the more fragile of the two.

## `npm run check:docs` treats this folder differently

Existence of this file is checked; its contents are **not** matched against the
directory listing. The generated filenames are the extractor's business, and an
engine upgrade must not fail the docs gate. Every other folder under `src/` is
matched strictly.

## Tests

`tests/e2e/engine.spec.ts` fails loudly if a member of the injected script
disappears or the two pins drift apart. `tests/e2e/roundtrip.spec.ts` catches
behavioural drift by handing every suggested locator to real Playwright.
