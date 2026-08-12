# Locator Lens

A standalone Chrome extension that turns "click an element" into a reliable
Playwright locator — scored, explained, and verified against the page before you
paste it into a test.

> Unofficial. Not affiliated with, endorsed by, or sponsored by Microsoft or the
> Playwright project. Bundles `playwright-core` (Apache-2.0) — see
> [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt), which ships inside the
> packaged extension as well.

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

## Contents

- [Install](#install) · [Quick start](#quick-start)
- [The panel, section by section](#the-panel-section-by-section) —
  [Locators](#locators) ·
  [Element & attributes](#element--attributes) ·
  [CSS & XPath](#css--xpath) ·
  [Try a selector](#try-a-selector) ·
  [Screenshot](#screenshot) ·
  [Page object](#page-object) ·
  [Settings](#settings)
- [How scoring works](#how-scoring-works)
- [Frames](#frames)
- [How it works](#how-it-works) · [Project layout](#project-layout)
- [Development](#development) · [Verification](#verification)
- [Upgrading the engine](#upgrading-the-engine) · [Extending the ranking](#extending-the-ranking)
- [Limitations](#limitations) · [Troubleshooting](#troubleshooting)

## Features

| | |
|---|---|
| **Ranked candidates** | Every viable locator, scored 0–100, with each deduction named ("Uses a positional index", "Targets a machine-generated id") |
| **Four client languages** | TypeScript, Python, Java and C#, switched from the header dropdown. Locators, the `frameLocator()` prefix, the page-object class and the editor's input syntax all follow it |
| **Live selector editor** | Type or paste any locator — with or without `page.`, including `frameLocator()` chains — and see the match count, every match highlighted, and strict-mode violations flagged. Searches every frame |
| **Element inspector** | Computed role, accessible name and description, attributes, state, DOM breadcrumb — so a ranking is explainable, not magic |
| **CSS & XPath** | Reference forms for DevTools and non-Playwright tools, both absolute and anchored to a nearby named element |
| **Screenshots** | Element or viewport, cropped from a real capture, with the picker's own overlay hidden. Copy to clipboard or download |
| **Page object export** | Collect several picks, export a page-object class in the selected language, following standard POM conventions |
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

Requires Chrome 114+ (for the side panel API). Loading unpacked is the
development path; the packaged build is what goes to the Chrome Web Store.

> `npm run build` refuses to run if `src/vendor/injectedScript.generated.js` is
> missing. Run `npm run vendor` first. The vendored files *are* committed, so a
> fresh clone builds without a `playwright-core` install — the step above is only
> needed after upgrading it.

## Quick start

1. Open the page you want locators for and click the toolbar icon. The side panel
   opens and the content script is injected into every frame.
2. Click **Pick element**, then click anything on the page.
   `Esc` cancels. `Alt+Shift+P` toggles picking without touching the panel.
3. The best candidate is at the top. Click any locator to copy it.
4. Hover a candidate to highlight what it matches, on the page, in real time.
5. Use **+ page object** to collect elements, then export the class.

Writing tests in something other than TypeScript? Set the language dropdown in
the header once — it is remembered — and everything the panel emits follows it.

## The panel, section by section

### Locators

The primary screen. One card per candidate, best first.

```
┌──────────────────────────────────────────────────────────┐
│  100   page.getByRole('button', { name: 'Save' })        │
│  role · 1 match · codegen default        copy  + page object │
│  • Role + accessible name: survives markup and styling changes │
└──────────────────────────────────────────────────────────┘
```

| Element | Meaning |
|---|---|
| Score badge | 0–100. Green ≥ 75, amber ≥ 45, red below |
| The `code` line | The full expression, `page.` prefix and any `frameLocator()` hops included. Click to copy |
| `kind` badge | How the locator identifies the element — `role`, `label`, `testid`, `css`… |
| `n matches` badge | From Playwright's own resolver, in the frame the element lives in |
| `codegen default` badge | This is what `npx playwright codegen` would have written |
| Bullet list | Every deduction, with its cost. A candidate with no deductions shows why its kind scores where it does instead |

Hovering a card highlights its matches on the page. Ordering is
[uniqueness first](#uniqueness-is-structural-not-a-cost) — a plain CSS path that
resolves to one element outranks a beautiful `getByRole` that resolves to six.
The ordering is fixed across languages: switching the dropdown re-renders the
same candidates in the same order, it does not re-rank them.

#### Client language

The header dropdown picks which Playwright client the panel writes for. The same
button comes out as:

| Language | |
|---|---|
| TypeScript | `page.getByRole('button', { name: 'Save' })` |
| Python | `page.get_by_role("button", name="Save")` |
| Java | `page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Save"))` |
| C# | `Page.GetByRole(AriaRole.Button, new() { Name = "Save" })` |

These are rendered by Playwright's own `asLocator`, the same function that gives
`codegen --target python` its output — not by string-rewriting the JavaScript
form. The setting is stored with your other settings and survives reopening the
panel.

All four renderings are produced at pick time, so switching the dropdown needs no
round trip to the page and keeps working after the page has navigated away from
the element you picked.

### Element & attributes

Everything the ranking was computed from, so a suggestion is explainable:

- **Tag**, **Role**, **Name** (the accessible name), **Description**
- **State** — visible/hidden, enabled/disabled, editable, checked/unchecked/mixed
- **Text** content, when there is any
- Every attribute, name and value
- A DOM breadcrumb: `body › main › form › div › button`

Role and accessible name matter most: they are the exact inputs `getByRole()`
depends on. If the name looks wrong here, that is *why* the top suggestion looks
wrong — the fix is in the page's markup, not the picker.

### CSS & XPath

Reference output for DevTools and non-Playwright tools. These are never offered
as Playwright locators and never scored.

Two forms are shown when both are available:

**Anchored** — the element expressed relative to its nearest uniquely
identifiable neighbour, e.g. `Anchored on #checkout-form, 2 levels up`:

```css
#checkout-form button              /* CSS  */
//*[@id='checkout-form']/descendant::button    /* XPath */
```

**Absolute** — the full path from the document root. Always correct, rarely
readable.

The anchored search is bounded on purpose: five ancestors up, five siblings each
way. Past that the "relationship" is a coincidence of layout, not something worth
putting in a selector, so nothing is emitted at all. Every anchored form is
resolved against the live document before it is shown, and dropped unless it
matches exactly the element it was built from — showing nothing is fine, showing
a selector that points somewhere else is the one outcome this must never produce.

Anchors are chosen in priority order: id (if it doesn't look machine-generated),
the configured test id attribute, then `name` / `aria-label` / `role` / `type` /
`title` / `alt` / `for` / `placeholder` / `href`, then `data-*`, then a class.

> Both forms use the native DOM APIs, which do not pierce shadow roots. An
> element inside a shadow root gets no CSS/XPath form — use the ranked locators,
> which do pierce.

### Try a selector

Type or paste anything Playwright accepts and see what it resolves to, live,
against the page as it currently is:

| You can paste | Example |
|---|---|
| Locator source | `getByRole('button', { name: 'Save' })` |
| …with the page prefix | `page.getByRole('button', { name: 'Save' })` |
| …or `await` | `await page.getByLabel('Email')` |
| Frame hops | `page.frameLocator('#modal').getByLabel('Note')` |
| Chained / filtered | `getByRole('row', { name: 'Globex' }).getByRole('button')` |
| Raw selector syntax | `internal:role=button[name="Save"i]` or `#save-btn` |

Locator source is read in the language the dropdown names, so whatever the panel
copied out can be pasted straight back in — `get_by_role("button", name="Save")`
under Python, `Page.GetByRole(…)` under C#. Raw selector syntax has no language
and parses under all four.

Matches are highlighted on the page as you type (180 ms debounce), in every frame
the expression reaches. **Clear** empties the box and unpaints every frame.

The status line tells you one of four things:

- `3 matches in the main frame` — or *in the addressed frame*, if you typed a
  `frameLocator()` chain
- `… — Playwright strict mode would throw here` when the count is above one
- `No matches …` — the selector is valid, the page has nothing for it
- A parse or query error, verbatim. **Parse success is not resolvability**:
  `internal:role=` parses fine and throws at query time. That is reported as an
  error, not silently as "0 matches", because 0 blames the page for a bad
  selector.

Below that, any frame the selector *also* matches in is listed separately with
the `frameLocator()` prefix needed to reach it, and a **use** button that rewrites
your expression to address it. That turns the usual "why is this 0?" into an
answer you can click. Frames that did not respond in time are counted and
reported — usually cross-origin ones you have not granted access to.

### Screenshot

Two buttons, **Element** and **Viewport**. Element is enabled once you have
picked something.

- The picker's own highlight boxes are hidden for the exposure, so the shot is a
  picture of the page, not of the tool.
- Geometry is re-measured at capture time, never remembered from the pick — the
  element is scrolled into view, measured fresh, and the rect is translated up
  through any frames it lives in. If the element has since been removed, you get
  a message rather than a blank PNG.
- An element bigger than the window is captured as far as it goes, with a warning
  that it is cut off.
- **Copy image** puts a PNG on the clipboard. **Download** saves it, named after
  the accessible name (`save.png`), falling back to role, then tag.
- The size badge is in device pixels — a 100 × 30 CSS-pixel button on a 2× display
  is a 216 × 76 shot, the 4 px of padding on each side included.

One shot is kept at a time; picking a new element clears it, because the old
picture is now a picture of something else.

**There is no full-page option, deliberately.** `chrome.tabs.captureVisibleTab`
photographs the viewport and costs nothing in permissions — `activeTab` already
covers it, so the install prompt stays clean, and an element shot is just a crop
of a viewport capture. Going beyond the viewport needs either `chrome.debugger`
(an install warning *and* a permanent "being debugged" banner on the page, which
also breaks the no-CDP rule this project rests on) or a scroll-and-stitch loop
fighting sticky headers, lazy loading and a 2-captures-per-second quota. Neither
is a trade a locator picker should make.

### Page object

Click **+ page object** on any candidate to collect it. Name the page, then copy
or download the class — in whichever language the header dropdown names.

```ts
import type { Page } from '@playwright/test';

export class CheckoutPage {
  /** textbox: Email */
  readonly emailInput = this.page.getByLabel('Email');
  /** button: Place order */
  readonly placeOrderButton = this.page.getByRole('button', { name: 'Place order' });

  constructor(private readonly page: Page) {}
}
```

```python
from playwright.sync_api import Page


class CheckoutPage:
    def __init__(self, page: Page) -> None:
        self.page = page
        # textbox: Email
        self.email_input = page.get_by_label("Email")
        # button: Place order
        self.place_order_button = page.get_by_role("button", name="Place order")
```

Java declares the fields and assigns them in the constructor (`page` is not in
scope at field-initialiser time); C# uses expression-bodied `ILocator`
properties over a `_page` field, as Playwright's own .NET samples do.

Property names are derived from the accessible name, suffixed by role
(`save` → `saveButton`, but `Save Button` stays `saveButton` — no duplication),
capped at four words, and de-duplicated with `2`, `3`, … Casing follows the
language: `saveButton` for TypeScript and Java, `save_button` for Python,
`SaveButton` for C#. A name that collides with a reserved word or with the page
field gets a `locator` suffix, in that same casing — Python's `class` becomes
`class_locator`, not `classLocator`. Frame hops are folded into the property, so
the class works from its own page field.

Switching the language re-renders the class, the property names and the download
filename together; you do not have to re-pick anything.

The class name and filename are both derived from what you type —
`Customer Details` → `CustomerDetailsPage` in `customer-details.page.ts`,
`customer_details_page.py`, `CustomerDetailsPage.java` or
`CustomerDetailsPage.cs`.

**No assertions and no action methods are generated.** Those are written by hand
once the shape of the flow is known; this generates the tedious half only.

### Settings

**Client language** — the header dropdown, not this section, but it is stored
here: `chrome.storage.sync`, alongside the test ID attribute, so it survives
reopening the panel and follows your Chrome profile.

**Test ID attribute** — must match `use.testIdAttribute` in your Playwright
config, or `getByTestId()` suggestions will not match what your tests resolve.
Defaults to `data-testid`. It is also what anchored CSS/XPath prefer as an anchor,
so the two agree. Stored in `chrome.storage.sync`.

**Stay connected** — see below.

#### Permissions

The extension ships with `activeTab` only — no "read your data on all websites"
warning at install. Chrome grants access when you click the toolbar icon and
revokes it when the page navigates to a different origin.

If you're working through a flow that crosses origins (an SSO redirect, say), the
panel's **Stay connected** button requests all-sites access for the session.
Entirely optional, and revocable from the same button. It must be pressed
directly — Chrome requires a user gesture for `permissions.request()`.

Full manifest surface: `activeTab`, `scripting`, `sidePanel`, `storage`, plus
`<all_urls>` as an *optional* host permission. Nothing is requested until you ask.

## How scoring works

A candidate starts at a base score for its kind and loses points for each rule
that matches its selector. The result is clamped to 0–100.

**Base score by kind** (`src/core/rules.ts`):

| Kind | Score | Why |
|---|---|---|
| `role` | 100 | Role + accessible name: survives markup and styling changes |
| `label` | 95 | Label association: stable as long as the visible label is |
| `placeholder` | 85 | Stable, but often changes with copy edits |
| `testid` | 80 | Stable by contract, if the team maintains it |
| `alt` | 70 | Stable for images with meaningful alt attributes |
| `title` | 60 | Rarely a deliberate contract |
| `text` | 50 | Fine for assertions, brittle for interaction |
| `other` | 40 | Internal Playwright selector |
| `css` | 25 | Couples the test to DOM structure and styling |

**Deductions:**

| Rule | Cost | Fires on |
|---|---|---|
| `no-match` | 100 | Resolves to nothing — unusable |
| `ambiguous` | 60 | Resolves to more than one element; strict mode would throw |
| `nth-index` | 45 | `nth=`, `:nth-child`, `:nth-of-type` |
| `generated-id` | 40 | Ids like `#B48291736` — regenerate between builds |
| `hash-class` | 40 | Hashed classes/ids, e.g. CSS-module output |
| `styling-class` | 25 | `.is-active`, `.t-Button--hot`, `.col-6`, `.mt-4` … |
| `dynamic-text` | 20 | Text containing numbers, dates or currency |
| `deep-chain` | 15 | Four or more `>>` parts |
| `long-text` | 10 | Text matches 60+ characters long |

#### Uniqueness is structural, not a cost

`rank()` tiers candidates by match count *before* comparing scores: exactly one
match, then more than one, then none. No rule weighting can promote a locator
that strict mode would reject above one that actually resolves.

This was found by a unit test: an ambiguous `getByRole` (100 − 60 = 40) was
beating a unique CSS path (25). No penalty weighting can express "always" —
tiering can. Ties break toward the codegen default, then toward the shorter
locator.

## Frames

A pick inside an iframe comes back with the full chain already applied:

```ts
page.frameLocator('#payment').frameLocator('iframe[name="card"]').getByLabel('Card number')
```

The panel never addresses sub-frames itself. A pick bubbles up the frame tree and
each parent prepends a `frameLocator()` hop for the `<iframe>` hosting the frame
below it. The child is identified by comparing `event.source` against each
`iframe.contentWindow`, which works even cross-origin — where DOM access does not.

**Counts are never summed across frames.** `page.getByRole(...)` does not search
iframes in real Playwright, so a total would be a number no test could reproduce
— the exact dishonesty this project exists to avoid. The addressed frame is
authoritative; matches elsewhere are listed separately with the prefix needed to
reach them.

## How it works

```
side panel  ──chrome.runtime──▶  top frame content script
                                        │ window.postMessage
                                        ▼
                                   child frames
```

The top frame is the coordinator. The service worker is deliberately thin: it
opens the panel, injects `content.js` into every frame, and stays out of the
message path.

### Cross-frame evaluation

The live editor fans out over the same tree. One downward pass does two jobs:
every frame evaluates the selector against its own document, and each parent
checks whether a child is the next `frameLocator()` hop the user typed, passing an
`onPath` flag down. A frame is *the target* when it is still on the addressed path
and no hops remain — so there is no second routing round trip. Results bubble back
up gaining prefixes, against an absolute deadline in the message, so one wedged
iframe is counted as unreachable rather than hanging the editor.

The engine runs in the content script's **isolated world**. It only needs the
DOM, so it never touches page JavaScript, and the host page's CSP does not apply.

### Why no `eval`

MV3 forbids `eval` in extension contexts. Playwright ships its engine as a
*string* that its server evaluates in the page. `scripts/vendor-playwright-engine.mjs`
performs that same wrapping at **build time**, emitting an ordinary ES module. The
result is statically analysable JavaScript that esbuild bundles like any other
import.

Two pieces are vendored, extracted differently:

| Piece | Source | How |
|---|---|---|
| Injected script (generate, query, ARIA) | `lib/generated/injectedScriptSource.js` | A *string*; wrapped into an ES module at build time |
| Selector-text tooling (locator parsing, frame splitting) | `lib/utils/isomorphic/{locatorParser,selectorParser}.js` | Ordinary isomorphic CJS; esbuild bundles it directly |

The second is what makes the live editor possible: it is isomorphic, so it runs
in plain Node and is unit tested without a browser.

## Project layout

| Directory | Role |
|---|---|
| `src/vendor/` | Generated, **committed on purpose** — builds without a `playwright-core` install, and engine changes show up in review |
| `src/engine/` | Thin wrappers: bootstrap, generate, query, inspect. The only code that knows the engine exists |
| `src/core/` | Pure logic: ranking, rules, raw and anchored selectors, crop geometry, locator-input parsing, POM naming and the four page-object emitters. Unit tested without a browser |
| `src/content/` | Picker state machine, overlay, frame chain, cross-frame evaluate and measure |
| `src/sidepanel/` | Preact UI, the chrome.* bridge, and screenshot cropping |
| `src/shared/` | Message and domain types, plus the expression renderer both sides use |
| `src/background/` | Service worker: opens the panel, injects the content script |
| `assets/` | `icons/` (derived from one master PNG) and `store/` (listing tiles and screenshots) — both generated, both committed |
| `scripts/` | `vendor-playwright-engine.mjs` (extraction), `build.mjs` (~100 lines of esbuild), plus icon, store-asset and packaging scripts |
| `docs/` | [Chrome Web Store submission](docs/chrome-web-store-submission.md) — every dashboard field, with the reasoning behind each answer — and the [privacy policy](docs/privacy-policy.md) |

The blast radius of the engine dependency is contained: everything goes through
`src/engine/*`, so swapping it touches four files.

## Development

```bash
npm run watch         # esbuild watch -> dist/
npm run typecheck     # tsc --noEmit
npm run icons         # assets/icons/icon-master.png -> icon-{16,32,48,128}.png
npm run store:assets  # listing tiles and screenshots -> assets/store/
npm run package       # build + zip -> release/locator-lens-<version>.zip
```

`npm run package` rather than `Compress-Archive`: PowerShell 5.1 writes
subdirectory entries with a backslash, which the ZIP spec forbids, and Chrome
then cannot resolve `icons/icon-16.png` from the manifest. `scripts/package.mjs`
writes the entries by hand and checks that every file the manifest names is
present.

After a rebuild, reload the extension in `chrome://extensions` — there is no HMR.
The panel can be reopened with the toolbar icon; the content script re-injects
itself on every panel connect, guarded by a `__pspLoaded` flag so a second run is
a no-op.

Three bundles are emitted, and the formats are not interchangeable:

| Output | Format | Why |
|---|---|---|
| `content.js` | IIFE | MV3 content scripts cannot be ES modules. Carries the vendored engine |
| `background.js` | ESM | Declared `type: module` in the manifest |
| `sidepanel.js` | IIFE | Preact, `jsx: automatic` |

`manifest.json` is generated by `scripts/build.mjs`, not checked in — the version
and permissions live in that file, next to the comments explaining them.

esbuild rather than Vite + CRXJS: MV3 content scripts cannot be ES modules
anyway, and a ~95-line build script is boring and does not break. HMR on the
panel was the price.

## Verification

```bash
npm run typecheck
npm run test:unit    # 115 tests — ranking, POM codegen, crop geometry, locator parsing
npm run test:e2e     # 48 tests — round-trip, engine API, extension integration
npm test             # all of the above
```

| Suite | Covers |
|---|---|
| `tests/unit/rank.spec.ts` | Scoring, tiering, tie-breaks |
| `tests/unit/pom.spec.ts` | Property naming and casing per language, de-duplication, class/file naming, and an inline snapshot of each of the four emitters |
| `tests/unit/expression.spec.ts` | Root receiver, frame-hop spelling and chain assembly per language |
| `tests/unit/crop.spec.ts` | Crop arithmetic — scale measurement, clamping, clipped detection |
| `tests/unit/locatorInput.spec.ts` | `page.` stripping, frame splitting, parse failures, reading each language's source |
| `tests/e2e/roundtrip.spec.ts` | The one the design rests on |
| `tests/e2e/engine.spec.ts` | Fails loudly if a member of the injected script disappears |
| `tests/e2e/extension.spec.ts` | The packaged extension, real service worker, real `chrome.*` messaging |

The important one is `tests/e2e/roundtrip.spec.ts`. It drives the real pipeline
over every element in a hostile fixture page (duplicate buttons, generated ids,
hashed classes, `aria-labelledby`, shadow DOM, an iframe), then hands each
suggested locator to **real Playwright** and asserts it resolves to exactly one
element — the same one that was picked.

If the vendored engine ever drifts from Playwright's behaviour, that test fails.

`tests/e2e/extension.spec.ts` loads the packaged extension and drives the real
service worker and content script over the real `chrome.*` messaging path,
including a pick inside an iframe. It loads a temp copy of `dist/` with
`<all_urls>` promoted from optional to granted — Playwright can neither click
browser chrome nor supply the user gesture `permissions.request()` needs. Only
the consent step is bypassed; everything else is the shipped code.

## Upgrading the engine

```bash
npm run vendor:upgrade -- 1.59.0     # or: -- latest
```

That installs `playwright-core` and `@playwright/test` at the same exact version,
pulls the matching Chromium, re-vendors, and runs the full suite. By hand:

```bash
npm install --save-exact playwright-core@<version> @playwright/test@<version>
npx playwright install chromium
npm run vendor
npm test
```

The two packages must move **together**. `playwright-core` supplies the engine;
`@playwright/test` runs the suite that validates it. Bumping one alone does not
error — npm installs a second `playwright-core` nested under `@playwright/test`,
so the new engine ends up validated by the old runner. `tests/e2e/engine.spec.ts`
asserts the pins are equal.

Both are pinned exactly (currently **1.58.2**) because the extractor
reads internal paths that carry no semver guarantee. That price is paid
deliberately: the alternative is re-implementing ARIA role and accessible-name
computation — roughly a thousand lines that *will* drift on `aria-labelledby`,
label association, and alt/title fallbacks. A picker whose "verified unique"
selector then fails in the actual test is worse than no picker.

Three guards catch a bad upgrade: `tests/e2e/engine.spec.ts` fails loudly if a
member of the injected script disappears or the two pins drift apart,
`tests/unit/locatorInput.spec.ts` covers
the selector-text half in plain Node, and the round-trip suite catches behavioural
drift in either.

The language dropdown rests on the engine keeping all four of its `asLocator`
generators — `javascript`, `python`, `java`, `csharp`. A missing one would not
throw, it would quietly render something unusable, so `engine.spec.ts` asserts
the exact output of each and reads every one of them back through the parser.

**Known layout change:** `playwright-core` ≤ 1.61 ships the bundle at
`lib/generated/injectedScriptSource.js`; 1.62+ folds it into `lib/coreBundle.js`.
The extractor handles both, but the 1.62+ path is a string-literal extraction and
is the more fragile of the two.

## Extending the ranking

`src/core/rules.ts` is a data table, not branching code. Each rule is an id, a
human-readable reason shown verbatim in the panel, a cost, and a predicate:

```ts
{
  id: 'apex-engine-id',
  reason: 'Targets an APEX engine-generated id — changes when the page is re-saved',
  cost: 40,
  test: (s) => /#B\d{6,}/.test(s),
}
```

Append to `DEFAULT_RULES`, or pass your own array as `rank()`'s second argument.
The scoring algorithm does not change. Because uniqueness is
[handled structurally](#uniqueness-is-structural-not-a-cost), no rule you add can
promote a locator that strict mode would reject.

An Oracle APEX ruleset — engine ids, Universal Theme classes (`.t-Button--hot`),
`#P10_ITEM` promoted to test-id rank, modal iframe detection — is the obvious
next one and needs nothing else to change.

## Limitations

- **No full-page screenshots.** [Deliberate](#screenshot).
- **No action recording.** This picks locators; it is not a codegen replacement.
- **Chrome only, unpacked.** MV3 side panel API, Chrome 114+.
- **Restricted pages are off-limits.** Chrome blocks extensions on `chrome://`
  URLs, the Web Store, and the PDF viewer. The panel says so instead of failing
  silently.
- **CSS/XPath do not pierce shadow DOM.** The ranked locators do; the reference
  forms use native DOM APIs and stop at the shadow boundary.
- **Cross-origin frames need permission.** Without all-sites access they are
  reported as unreachable rather than searched.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Can't reach this page" | A restricted URL, or the content script was never injected. Open a normal page and click the toolbar icon again |
| Panel goes dead after a login redirect | `activeTab` was revoked on the cross-origin navigation. Click the toolbar icon again, or turn on **Stay connected** |
| `getByTestId()` doesn't match in your test | The **Test ID attribute** setting disagrees with `use.testIdAttribute` in your Playwright config |
| "N frames did not respond" | Cross-origin iframes without host permission. Grant all-sites access in Settings |
| The panel shows a different element than you clicked | Retargeting, and the panel says so — e.g. an `<option>` resolves to its `<select>`, which is correct advice (`selectOption()`) but a different element |
| Chrome would not capture this tab | `activeTab` expired, or the tab is restricted. Click the toolbar icon, or enable **Stay connected** |
| Changes don't show up after a rebuild | Reload the extension in `chrome://extensions`. There is no HMR |
| `npm run build` fails on a missing vendored engine | Run `npm run vendor` first |
| `npm run build` fails on a missing icon | Run `npm run icons` first |

## Licence

[MIT](LICENSE) for this project's own source.

The vendored `playwright-core` selector engine under `src/vendor/` is Apache-2.0.
Its notice is [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt), which the build
copies into `dist/` so it travels inside the packaged extension — an Apache-2.0
obligation, and one esbuild's `legalComments: 'none'` would otherwise drop.
