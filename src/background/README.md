# src/background

The MV3 service worker. One file, ~66 lines, and it should stay that size.

**Boundary:** imports **nothing** — not even `src/shared/`. Calls `chrome.*`
only. Bundles to `background.js` as **ESM** (declared `type: module` in the
generated manifest), which is the one bundle whose format differs from the other
two.

## Files

| File | Role | Key exports |
| --- | --- | --- |
| `index.ts` | Opens the side panel, injects `content.js` into every frame | — (entry point) |

## Invariants

- **The worker stays out of the message path.** The panel talks to the top frame
  directly via `chrome.tabs.sendMessage`. Routing picks or evaluations through
  here would add a hop that can be evicted mid-flight — service workers are killed
  aggressively and hold no reliable state.
- **No business logic, no imports.** If this file starts needing a module,
  question the change rather than adding the import. Ranking, parsing and
  inspection all belong on the other side of the message boundary.
- **Injection is on demand, into every frame.** The content script is absent from
  pages the user never points it at, which is what keeps `activeTab` honest. The
  content side guards re-injection with `__pspLoaded`.
- **The extension holds no host permissions at install.** `activeTab` is granted
  by the toolbar click and revoked on cross-origin navigation; `<all_urls>` is
  *optional* and requested only from the panel, under a user gesture.

## Changing this folder

- Adding a `chrome.*` listener → check it survives worker eviction. Anything
  needing continuity belongs in the panel, which stays alive while open.
- Adding a permission → it also goes in `scripts/build.mjs` (the manifest is
  generated, not checked in) and needs a justification in
  `docs/chrome-web-store-submission.md`. A new install-time warning is a store
  review risk, not just a config change.
- Adding a file → add a row above, or `npm run check:docs` fails.

## Tests

`tests/e2e/extension.spec.ts` loads the packaged extension and drives the real
service worker — panel open, content injection, and the full `chrome.*`
messaging path.
