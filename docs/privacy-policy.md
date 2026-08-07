# Locator Lens — Privacy Policy

_Last updated: 7 August 2026_

**Locator Lens does not collect, transmit, or share any data.**

The extension makes no network requests of any kind. There is no server, no
account, no analytics, no telemetry, no crash reporting, and no third-party SDK.
Nothing you do in the extension leaves your computer.

## What the extension reads

To do its job — turning an element you click into a Playwright locator — the
extension reads, in the page you are actively using:

- the clicked element's tag, ARIA role, accessible name and description,
  attributes, text content, state, and position in the DOM
- the geometry of that element, and (only when you press the screenshot button)
  a picture of the visible tab

All of it is read on demand, displayed back to you in the side panel, and
discarded when you pick something else or close the panel. None of it is
transmitted anywhere, and none of it is written to disk.

Screenshots exist as an in-memory image in the side panel for as long as you
leave them open. They are never uploaded; "Copy image" and "Download" put the
picture on your own clipboard or in your own downloads folder, at your request.

## What the extension stores

One thing, in `chrome.storage.sync`: your **Test ID attribute** setting (for
example `data-testid`), plus small user-interface preferences. These are your own
settings. They are stored by Chrome, synced by Chrome across your own signed-in
browsers under your own Google account, and are never sent to the developer or
to anyone else. No page content, picked elements, screenshots, or browsing
history is stored.

## Permissions, and why each is needed

| Permission | Why |
|---|---|
| `activeTab` | Access to the one tab you are picking in, granted when you click the toolbar icon and revoked when you navigate away. Used to inject the picker, read the element you click, and capture the visible tab for screenshots. |
| `scripting` | Injects the extension's own bundled content script into that tab, on demand, so the extension runs on no page until you ask it to. |
| `sidePanel` | The entire user interface is a side panel — a popup would close the moment you clicked into the page. |
| `storage` | Stores the test-id attribute setting described above. |
| `<all_urls>` (optional) | Never requested at install. Only if you press **Stay connected**, which keeps a picking session alive across a cross-origin navigation such as an SSO redirect. Revocable from the same button. Used for exactly what `activeTab` is used for and nothing else. |

## Third-party code

The extension bundles `playwright-core`'s selector engine (Apache-2.0) so that
suggested locators match what Playwright itself resolves. It is compiled into the
package at build time; it makes no network requests and contacts no Microsoft or
Playwright service. The full licence notice ships inside the extension as
`THIRD_PARTY_NOTICES.txt`.

Locator Lens is unofficial and is not affiliated with, endorsed by, or sponsored
by Microsoft or the Playwright project.

## Children

The extension is a developer tool and is not directed at children. It collects
nothing from anyone, of any age.

## Changes

If a future version ever collects or transmits anything, this policy will be
updated before that version ships, and the Chrome Web Store listing's data
disclosures will be updated to match.

## Contact

Questions: open an issue at <https://github.com/RonelBG1213/locator-lens/issues>,
or email the address listed on the Chrome Web Store listing.
