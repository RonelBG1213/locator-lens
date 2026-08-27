# src/sidepanel

The Preact UI, the `chrome.*` bridge, and screenshot cropping. Bundles to
`sidepanel.js` (IIFE, `jsx: automatic`).

**Boundary:** may import `src/core/` and `src/shared/` and call `chrome.*`. Must
**not** import `src/engine/` or `src/content/` — pulling in the engine would drag
the ~300KB injected bundle into a panel that has no use for it.

`components/` has no separate doc; its files are listed below with a prefix.

## Files

| File | Role | Key exports |
| --- | --- | --- |
| `main.tsx` | Panel entry: state, message plumbing, layout | — (entry point) |
| `bridge.ts` | The panel's side of the messaging contract, plus settings and clipboard | `send()`, `ensureInjected()`, `activeTabId()`, `loadSettings()`, `copyImageToClipboard()` |
| `capture.ts` | Visible-tab capture → the requested element or viewport picture | `crop()`, `Shot` |
| `styles.ts` | Panel CSS as a template string, injected once at startup | `PANEL_CSS` |
| `index.html` | Panel document; loads the bundle | — |
| `components/Candidates.tsx` | Ranked locator cards, scores, deductions | `Candidates()` |
| `components/Inspector.tsx` | Role, accessible name, attributes, breadcrumb | `Inspector()` |
| `components/SelectorEditor.tsx` | The live "try a selector" box | `SelectorEditor()` |
| `components/Screenshot.tsx` | Element / viewport buttons, preview, copy, download | `Screenshot()` |

## Invariants

- **Every message targets `frameId: 0` explicitly.** Without it Chrome fans the
  message out to all frames and resolves with whichever replies first — on a page
  with iframes that is a coin toss.
- **Never put an image in `chrome.storage.sync`.** 8KB per item, 100KB total; a
  PNG data URL is megabytes. The shot lives here as a Blob plus an object URL,
  revoked when replaced.
- **The image never crosses a message boundary.** Only the rect travels, and it
  travels in the other direction. The panel calls `captureVisibleTab` itself.
- **The viewport shot's highlight box is composited onto the canvas here**, not
  left to the page overlay. The overlay tracks the *selector being edited* rather
  than the picked element, there is an rAF race between painting a box and
  opening the shutter, and its "N matches" label would land in the picture.
  Element shots get no box at all — the crop *is* the element.
- **An element shot scrolls its target into view; a viewport shot must not.**
  Otherwise it photographs a viewport the user never asked for. An off-screen
  pick therefore yields no box, and the panel says so rather than quietly
  omitting it.
- **There is no full-page option, deliberately.** It needs either
  `chrome.debugger` — an install warning plus a permanent "being debugged" banner,
  which also breaks the no-CDP rule the project rests on — or a scroll-and-stitch
  loop fighting sticky headers, lazy loading and a 2-per-second quota. Reject the
  request again if it resurfaces; the reasoning has not changed.
- **`permissions.request()` needs a real user gesture.** "Stay connected" must
  stay a direct button press; it cannot be triggered programmatically.

## Changing this folder

- New panel → content call → add the variant to `shared/messages.ts` first, then
  a wrapper in `bridge.ts`. Components should not call `chrome.*` directly.
- Restyling → `styles.ts` is one template string on purpose: one bundle, no extra
  fetch, no CSP loader config. Keep it that way.
- Adding a file or a component → add a row above (components with the
  `components/` prefix), or `npm run check:docs` fails.

## Tests

`tests/e2e/extension.spec.ts` loads the packaged extension and drives the real
panel. Crop arithmetic is unit tested through `core/crop.ts` in
`tests/unit/crop.spec.ts` — that is precisely why the geometry lives in `core/`
and not here.
