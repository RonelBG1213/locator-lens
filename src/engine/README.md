# src/engine

The only code in the repo that knows Playwright's engine exists. Four thin
wrappers: bootstrap, generate, query, inspect.

**Boundary:** may import `src/shared/`, `src/core/shadow.ts`, and the vendored
injected script. Must not call `chrome.*`. Nothing outside this folder may reach
`vendor/injectedScript.generated.js`.

This containment is the point: swapping or upgrading `playwright-core` is a
review of four files, not a hunt.

## Files

| File | Role | Key exports |
| --- | --- | --- |
| `bootstrap.ts` | Owns the single `InjectedScript` instance for this frame | `engine()`, `setTestIdAttribute()`, `testIdAttribute()`, `PLAYWRIGHT_CORE_VERSION` |
| `generate.ts` | Picked element → raw candidate list, before ranking | `candidatesFor()`, `toLocator()`, `detectRetarget()`, `kindOf()` |
| `query.ts` | Selector resolution within one document | `queryAll()`, `countMatches()`, `evaluateLocal()`, `resolveFrameElement()` |
| `inspect.ts` | The Inspector pane's view: role, accessible name, state | `inspect()` |

## Invariants

- **One `InjectedScript` per frame, rebuilt only when the test-id attribute
  changes.** The engine caches ARIA computations internally; rebuilding per pick
  throws that away. The attribute is baked in at construction, which is why a
  settings change forces the rebuild.
- **`customEngines: []` in `bootstrap.ts` must stay empty.** The vendored bundle
  contains `eval(e){return this.window.eval(e)}`, and the Chrome Web Store
  "remote code: No" answer rests on that path being unreachable. Registering a
  custom engine makes it reachable and makes the store answer false. See
  `docs/chrome-web-store-submission.md`.
- **Frame-crossing is deliberately not handled here.** A Playwright selector
  cannot span a frame boundary in one query. `query.ts` answers for *one*
  document; fan-out lives in [`src/content/`](../content/README.md).
- **Never re-derive role or accessible name.** `inspect.ts` delegates to the
  engine's own ARIA implementation. Computing it here would eventually disagree
  with Playwright, and the panel would confidently show a name no `getByRole`
  can match — the exact failure this project exists to prevent.
- **`evaluateLocal()` distinguishes "no matches" from "threw".** Returning 0 for
  a selector that failed to resolve blames the page for a bad selector.

## Changing this folder

- Upgrading the engine → `npm run vendor:upgrade -- <version>`, then read all
  four files. `playwright-core` and `@playwright/test` move **together**;
  `engine.spec.ts` asserts the pins are equal.
- Adding an engine call → keep it inside this folder and export a narrow function.
  Callers should never receive an `InjectedScript`.
- Adding a file → add a row above, or `npm run check:docs` fails.

## Tests

`tests/e2e/engine.spec.ts` fails loudly if a member of the injected script
disappears or the two version pins drift apart.
`tests/e2e/roundtrip.spec.ts` catches behavioural drift by handing every
suggested locator to real Playwright.
