# Playwright Selector Picker

A standalone Chrome extension that turns "click an element" into a reliable
Playwright locator — scored, explained, and verified against the page before you
paste it into a test.

No companion server, no CDP connection, no network calls. Everything runs in the
browser.

## Why this one is different

Most selector pickers hand-roll their own matching, so the locator they show is a
*guess* at what Playwright would do. This one vendors **Playwright's own injected
script** — the same bundle that powers `npx playwright codegen` and the Inspector.

That means:

- the suggested locator is literally what Playwright's codegen would emit
- match counts come from Playwright's real resolver (`internal:role=`,
  `internal:label=`, `:visible`, shadow-DOM piercing, strict mode)
- **"1 match" in the panel means 1 match in the test**

That claim is enforced by a test, not just asserted in a README — see
[Verification](#verification).

## Features

| | |
|---|---|
| **Ranked candidates** | Every viable locator, scored 0–100, with each deduction named ("Uses a positional index", "Targets a machine-generated id") |
| **Live selector editor** | Type any selector, see the match count and every match highlighted on the page as you type; strict-mode violations flagged |
| **Element inspector** | Computed role, accessible name and description, attributes, state, DOM breadcrumb — so a ranking is explainable, not magic |
| **CSS & XPath** | Reference forms for DevTools and non-Playwright tools |
| **Page object export** | Collect several picks, export a `*.page.ts` class following standard POM conventions |
| **iframe support** | Picks inside frames come back with the full `frameLocator(...)` chain |
| **Retarget warnings** | When Playwright deliberately points elsewhere (an `<option>` → its `<select>`), the panel says so instead of silently handing you a different element |

## Install

```bash
npm install
npm run vendor    # extract Playwright's engine into src/vendor/
npm run build     # -> dist/
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select `dist/`.

Requires Chrome 114+ (for the side panel API).

## Use

1. Click the toolbar icon. The side panel opens.
2. Click **Pick element**, then click anything on the page. `Esc` cancels.
   `Alt+Shift+P` toggles picking.
3. Click any candidate to copy it.
4. Use **+ page object** to collect elements, then export the class.

### Permissions

The extension ships with `activeTab` only — no "read your data on all websites"
warning at install. Chrome grants access when you click the toolbar icon and
revokes it when the page navigates to a different origin.

If you're working through a flow that crosses origins (an SSO redirect, say), the
panel's **Stay connected** button requests all-sites access for the session.
Entirely optional, and revocable from the same button.

### Settings

**Test ID attribute** — must match `use.testIdAttribute` in your Playwright
config, or `getByTestId()` suggestions will not match what your tests resolve.
Defaults to `data-testid`.

## How it works

```
side panel  ──chrome.runtime──▶  top frame content script
                                        │ window.postMessage
                                        ▼
                                   child frames
```

The top frame is the coordinator. Child frames never talk to the panel directly:
a pick made inside an iframe bubbles up, and each parent prepends a
`frameLocator()` hop for the `<iframe>` that hosts the frame below it. The child
is identified by comparing `event.source` against each `iframe.contentWindow`,
which works even cross-origin.

The engine runs in the content script's **isolated world**. It only needs the
DOM, so it never touches page JavaScript, and the host page's CSP does not apply.

| Directory | Role |
|---|---|
| `src/vendor/` | Generated. Playwright's engine, extracted at build time |
| `src/engine/` | Thin wrappers: generate, query, inspect. The only code that knows the engine exists |
| `src/core/` | Pure logic: ranking, rules, raw selectors, POM codegen. Unit tested without a browser |
| `src/content/` | Picker state machine, overlay, frame chain |
| `src/sidepanel/` | Preact UI |
| `src/background/` | Service worker: opens the panel, injects the content script |

### Why no `eval`

MV3 forbids `eval` in extension contexts. Playwright ships its engine as a
*string* that its server evaluates in the page. `scripts/vendor-playwright-engine.mjs`
performs that same wrapping at **build time**, emitting an ordinary ES module. The
result is statically analysable JavaScript that esbuild bundles like any other
import.

## Verification

```bash
npm run typecheck
npm run test:unit    # 41 tests — ranking, POM codegen, naming
npm run test:e2e     # 24 tests — round-trip, engine API, extension integration
npm test             # all of the above
```

The important one is `tests/e2e/roundtrip.spec.ts`. It drives the real pipeline
over every element in a hostile fixture page (duplicate buttons, generated ids,
hashed classes, `aria-labelledby`, shadow DOM, an iframe), then hands each
suggested locator to **real Playwright** and asserts it resolves to exactly one
element — the same one that was picked.

If the vendored engine ever drifts from Playwright's behaviour, that test fails.

`tests/e2e/extension.spec.ts` loads the packaged extension and drives the real
service worker and content script over the real `chrome.*` messaging path,
including a pick inside an iframe.

## Upgrading the engine

```bash
npm install --save-exact playwright-core@<version>
npm run vendor
npm test
```

`playwright-core` is pinned exactly because the extractor reads an internal path
that carries no semver guarantee. `tests/e2e/engine.spec.ts` fails loudly if a
member the plugin depends on disappears, and the round-trip suite catches
behavioural drift.

**Known layout change:** `playwright-core` ≤ 1.61 ships the bundle at
`lib/generated/injectedScriptSource.js`; 1.62+ folds it into `lib/coreBundle.js`.
The extractor handles both, but the 1.62+ path is a string-literal extraction and
is the more fragile of the two.

## Extending the ranking

`src/core/rules.ts` is a data table, not branching code. Each rule is an id, a
human-readable reason shown verbatim in the panel, a cost, and a predicate.

To add an app-specific ruleset — Oracle APEX engine ids (`#B48291736`), Universal
Theme classes (`.t-Button--hot`), and so on — append rules to `DEFAULT_RULES` or
pass your own array as `rank()`'s second argument. The scoring algorithm does not
change.

Note that uniqueness is handled structurally, not by cost: `rank()` tiers
candidates by match count first, so no rule weighting can promote a locator that
strict mode would reject above one that actually resolves.
