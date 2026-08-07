# Chrome Web Store submission

Every field the dashboard asks for, filled in and ready to paste. Item ID
`kngjkejiohdbaeaeagjnngjemifejpmk`.

Keep this file in sync with what was actually submitted — on a rejection or a
version bump the answers get re-entered, and re-deriving them from scratch is how
inconsistencies creep in. Where an answer involved a judgement call, the reasoning
is recorded next to it rather than in someone's memory.

---

## 1. Account → Settings (publisher-level, blocks every item)

| Field | Value |
|---|---|
| Contact email | *your address — must be verified via the emailed link* |
| Publisher display name | *real name or handle; appears publicly as "Offered by …"* |
| Trader status | **Non-trader** — free tool, not distributed commercially. Declaring *trader* obliges you to publish a physical address and phone number on the listing. |

---

## 2. Store listing

**Item name** (75 char limit)

```
Locator Lens
```

**Summary / short description** (132 char limit — this is 121)

```
Click any element to get a ranked, verified locator for your Playwright tests. Unofficial; not affiliated with Microsoft.
```

**Category:** Developer Tools
**Language:** English (United States)

**Detailed description**

```
Locator Lens turns "click an element" into a Playwright locator you can paste
straight into a test — scored, explained, and verified against the page before
you copy it.

WHY IT IS DIFFERENT

Most selector pickers hand-roll their own matching, so the locator they show is a
guess at what Playwright would do. Locator Lens bundles Playwright's own injected
selector engine — the same code that powers `npx playwright codegen` and the
Inspector. The suggestion is literally what codegen would emit, and match counts
come from Playwright's real resolver, including strict mode and shadow-DOM
piercing. "1 match" in the panel means 1 match in the test.

WHAT YOU GET

• Ranked candidates — every viable locator scored 0-100, with each deduction
  named ("Uses a positional index", "Targets a machine-generated id")
• Live selector editor — paste any locator, with or without the page. prefix,
  including frameLocator() chains, and see the match count and every match
  highlighted on the page as you type
• Element inspector — computed role, accessible name, attributes, state and a
  DOM breadcrumb, so a ranking is explainable rather than magic
• CSS and XPath reference forms, both absolute and anchored to a nearby named
  element, for DevTools and non-Playwright tools
• Element and viewport screenshots, cropped from a real capture
• Page object export — collect several picks and export a *.page.ts class
• iframe support — picks inside frames come back with the full frameLocator()
  chain already applied

PRIVACY

Nothing leaves your machine. The extension makes no network requests: no
analytics, no telemetry, no accounts, no servers. The only thing it stores is
your own test-id attribute setting.

PERMISSIONS

It ships with activeTab only, so there is no "read your data on all websites"
warning at install. Chrome grants access when you click the toolbar icon and
revokes it when the page navigates to a different origin. If you are working
through a flow that crosses origins, an optional "Stay connected" button in the
panel requests all-sites access for the session — entirely opt-in, and revocable
from the same button.

Requires Chrome 114 or later.

Source: https://github.com/RonelBG1213/locator-lens

Unofficial. Not affiliated with, endorsed by, or sponsored by Microsoft or the
Playwright project. Bundles playwright-core, licensed under Apache-2.0; the full
notice ships inside the extension as THIRD_PARTY_NOTICES.txt.
```

---

## 3. Privacy practices → Single purpose

```
Locator Lens has a single purpose: to generate Playwright test locators for an
element the user clicks on the current page.

When the user clicks the toolbar icon, a side panel opens and the user picks an
element on the page. The extension reads that element's role, accessible name,
attributes and position in the DOM and shows ranked Playwright locator
expressions the user can copy into a test. Every feature in the extension — the
ranked locator list, the element inspector, the live match-count editor, the
element screenshot, and the page-object export — is a different view of that
same picked element and exists only to serve that one purpose.
```

---

## 4. Privacy practices → Permission justifications

Each one names the user-visible feature that needs the permission, which is what
reviewers look for. Every claim is verifiable against the source in about two
minutes — keep that property if you edit them.

**activeTab**

```
activeTab gives the extension access to the one page the user wants locators
for, and only after the user asks. It is granted when the user clicks the
extension's toolbar icon or presses its keyboard shortcut, which is the action
that starts a picking session. It is used to (a) inject the element picker into
that tab, (b) read the DOM of the element the user clicks so its role,
accessible name and attributes can be turned into a Playwright locator, and
(c) call chrome.tabs.captureVisibleTab for the optional screenshot of the
picked element. The extension requests no host permissions at install time.
```

**scripting**

```
chrome.scripting.executeScript injects the extension's own bundled content
script (content.js) into the active tab, in all frames, after the user clicks
the toolbar icon or presses the shortcut. That content script draws the hover
highlight, captures the element the user clicks, and computes the locator. It
is injected on demand rather than declared as a static content script so the
extension runs on no page until the user asks it to. Only files packaged inside
the extension are injected.
```

**sidePanel**

```
The extension's entire user interface is a side panel: the ranked locator list,
element details, live selector editor, screenshot and page-object export. A
side panel is required rather than a popup because a popup closes the moment
the user clicks into the page, and clicking an element on the page is the core
interaction of this extension. The panel opens only in response to the user
clicking the extension's toolbar icon.
```

**storage**

```
chrome.storage.sync stores the user's own settings only — principally the
test-id attribute name (for example data-testid) that must match the user's
Playwright configuration, plus small UI preferences. No page content, no picked
elements, no screenshots and no browsing data are stored, and nothing is sent
off the device.
```

**`<all_urls>` — optional host permission** (a field may not appear, since it is
optional; have this ready in case one does)

```
<all_urls> is declared as an optional host permission and is never requested at
install. Chrome revokes activeTab when the tab navigates to a different origin,
which ends a picking session mid-flow (for example during an SSO redirect). The
side panel offers a "Stay connected" button that calls permissions.request()
from a user gesture so picking survives such navigations; the same button
revokes it. The access is used for exactly the same thing as activeTab and
nothing else.
```

---

## 5. Privacy practices → Remote code

**Answer: No, I am not using remote code.**

Everything that runs ships inside the package. `scripts/vendor-playwright-engine.mjs`
performs the string-to-module wrapping at *build* time, so the vendored engine is
statically bundled JavaScript, not code fetched or assembled at runtime.

> Known objection, and the reply. Chrome's help text lists "a string evaluated
> through `eval()`" as an example of remote code, and `dist/content.js` does
> contain `eval(e){return this.window.eval(e)}` inherited from the vendored
> engine. Both paths that reach it are unreachable here: `src/engine/bootstrap.ts`
> constructs the engine with `customEngines: []`, and nothing in `src/` calls
> `evaluateExpression`. Dead code in a vendored dependency is not remote code.
>
> Do **not** answer Yes to be safe — it is inaccurate (nothing is fetched from
> anywhere) and routes the item into a materially stricter review.

---

## 6. Privacy practices → Data usage

**Leave all nine data-type boxes unchecked.**

Collection means transmitting data off the user's device. Verified against the
built bundles: no XHR, no WebSocket, no sendBeacon, and the only `fetch()` is
`fetch(dataUrl)` in `src/sidepanel/capture.ts` converting a local `data:` URL to
a Blob. The only outbound host strings in the bundle are `www.w3.org` SVG
namespaces.

The two worth a second thought, and why they are still No:

- **Website content** — the extension reads DOM text, attributes and a screenshot,
  but renders them back to the same user and discards them. The screenshot lives
  as a Blob in the panel and never crosses a message boundary. Reading data
  locally and showing it to the person who asked for it is not collection;
  otherwise every DevTools-style extension would tick this box.
- **User activity** — clicks and mouse position drive the picker overlay. Nothing
  is logged, stored or sent.

`chrome.storage.sync` holds a test-id attribute name such as `data-testid`. That
is the user's own setting, it rides Chrome's own sync, and it is not one of the
nine categories.

**Check all three certifications** — all true: nothing is sold or transferred
(nothing leaves the device at all), nothing is used outside the single purpose,
nothing touches creditworthiness or lending.

**Privacy policy URL:** not required while nothing is declared, and the field can
be left empty. One is published anyway at [privacy-policy.md](privacy-policy.md)
— cheap insurance that heads off a reviewer question, and the disclosures above
are written to match it exactly. Host it (GitHub Pages, or link the raw file) and
paste the URL if you would rather answer the question before it is asked.

If "Website content" is ever ticked, that URL stops being optional.

---

## 7. Graphic assets

All generated, all in `assets/`. Regenerate with `npm run icons` (from the
master artwork) and `npm run store:assets` (tiles and screenshots).

| Asset | Requirement | File |
|---|---|---|
| Extension icons | 16 / 32 / 48 / 128 PNG, declared in the manifest | `assets/icons/icon-{16,32,48,128}.png` — shipped in the package under `icons/` |
| Store icon | 128 × 128 PNG | `assets/icons/icon-128.png` |
| Screenshots | 1280 × 800, one to five | `assets/store/screenshot-{1,2,3}-1280x800.png` |
| Small promo tile | 440 × 280 | `assets/store/promo-small-440x280.png` |
| Marquee promo tile | 1400 × 560, only used if featured | `assets/store/promo-marquee-1400x560.png` |

The screenshots frame the **real built side panel** — `dist/sidepanel.html` in an
iframe, with `chrome.*` stubbed so it boots, and one representative pick pushed
through the panel's own message path. The pixels are the product; only the picked
element is staged, and its scores are the ones the real rules table produces for
that element. See `DEMO_PICK` in `scripts/make-store-assets.mjs` — keep that
property if you edit it, because a screenshot showing a score the tool would not
give is the kind of thing that is hard to explain later.

Upload order matters slightly: screenshot 1 is the listing's hero image.

---

## 8. Package

```bash
npm run package     # build + zip -> release/locator-lens-0.1.0.zip
```

**Do not zip with `Compress-Archive`.** Windows PowerShell 5.1 writes
subdirectory entries with a backslash (`icons\icon-16.png`), which the ZIP spec
forbids. Chrome then cannot resolve `icons/icon-16.png` from the manifest and the
upload fails on a missing icon, with nothing in the error naming the archiver.
`scripts/package.mjs` writes the entries by hand for that reason, and also
asserts that every file the manifest references is actually in `dist/`.

Two other structural rules it enforces: `manifest.json` sits at the archive root
(not under a `dist/` folder), and `THIRD_PARTY_NOTICES.txt` travels with the
binary — Apache-2.0 obliges that, and esbuild is set to `legalComments: 'none'`
so it cannot ride inside the bundle.

The listing name is read from the manifest, so uploading the package renames the
item automatically — there is no separate name field to retype.

---

## Pre-submit checklist

- [ ] Contact email entered **and verified** in Account → Settings (publisher-wide; blocks every item)
- [ ] Trader status declared
- [ ] `npm test` green — 43 e2e tests drive the packaged extension
- [ ] `npm run package` run *after* the last source change
- [ ] Zip inspected: `manifest.json` at root, `icons/` with forward slashes, `THIRD_PARTY_NOTICES.txt` present
- [ ] Store listing name, summary and description pasted from §2
- [ ] Single purpose pasted from §3
- [ ] Four permission justifications pasted from §4
- [ ] Remote code: **No**
- [ ] Data usage: nine boxes unchecked, three certifications checked
- [ ] Screenshots uploaded, hero first
- [ ] Store icon 128 × 128 uploaded

## Still outstanding

Nothing blocking. Two judgement calls left to you:

- **Privacy policy hosting.** The document exists; it has no public URL until you
  publish it somewhere. Optional while no data is declared.
- **The "S" in the icon.** The mark reads `S` — carried over from *Selector
  Picker*. It is not wrong, but it is not an `L` either, and an initial that does
  not match the product name is a small ongoing "why?" for anyone who notices.
  Replace `assets/icons/icon-master.png` and run `npm run icons` if you want to
  change it; nothing else needs touching.
