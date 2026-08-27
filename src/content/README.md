# src/content

The in-page half. Runs in **every** frame; only the top frame talks to the side
panel. Three subsystems share this folder: the picker, the freeze shield, and the
cross-frame machinery.

**Boundary:** may import `src/engine/`, `src/core/`, `src/shared/`, and may call
`chrome.runtime`. Bundles to `content.js` as an **IIFE** — MV3 content scripts
cannot be ES modules, which is why the build format is not negotiable.

## Files

| File | Role | Key exports |
| --- | --- | --- |
| `index.ts` | Content-script entry: pick mode, click capture, message routing | — (entry point) |
| `frames.ts` | Builds the `frameLocator(...)` chain by bubbling picks upward | `bubbleUp()`, `addHopForSource()`, `findFrameElement()`, `broadcastDown()` |
| `evaluate.ts` | Cross-frame selector evaluation for the live editor | `runEvaluation()`, `collectFromChild()`, `COLLECTION_BUDGET_MS` |
| `capture.ts` | Locates and measures the picked element at screenshot time | `measurePick()`, `setPickedElement()`, `MEASURE_BUDGET_MS` |
| `freeze.ts` | Holds dropdowns and popups open long enough to pick inside them | `initFreeze()`, `isFrozen()`, `setFrozen()`, `keepAlive()` |
| `overlay.ts` | Hover outline, role/name label, match highlight boxes | `showHover()`, `showMatches()`, `showBanner()`, `setSuppressed()`, `clear()` |

## Invariants

- **The top frame is the coordinator.** The panel never addresses a sub-frame. A
  pick bubbles up and each parent prepends its own `frameLocator()` hop.
- **Child frames are identified by `event.source`, not by DOM access.** Comparing
  the sender Window against each `iframe.contentWindow` works cross-origin, where
  reading the child's DOM does not. Do not replace this with a DOM lookup.
- **Never sum match counts across frames.** `page.getByRole(...)` does not search
  iframes in real Playwright, so a total would be a number no test could
  reproduce. The addressed frame is authoritative; other frames are listed
  separately with the prefix needed to reach them.
- **Every cross-frame wait is bounded by an absolute deadline carried in the
  message.** A frame that never answers is *counted as unreachable*, never waited
  on — one wedged cross-origin iframe must not hang the editor or the shutter.
  Silence until the deadline is itself the answer.
- **Screenshot geometry is measured fresh at capture time, never cached from the
  pick.** The page scrolls between picking and pressing the button. Exactly one
  frame holds the pick, so `capture.ts` needs none of the collect-every-answer
  machinery in `evaluate.ts`.
- **The overlay lives in a closed shadow root on `<html>`, `pointer-events:none`.**
  The page's CSS cannot restyle it and it cannot intercept the click being
  captured. It is suppressed for a screenshot exposure, not left visible.
- **`__pspLoaded` guards double injection.** The content script re-injects on
  every panel connect; a second run must be a no-op.

## Freeze, precisely

`freeze.ts` swallows the events transient panes close on. What it blocks is
deliberate and narrow:

| Blocked | When | Why not more |
| --- | --- | --- |
| `focusout`, `blur` | always | This is the one that fires when you click the side panel |
| `pointerdown`, `mousedown` | only while picking | So you can still type in the pane's own search box |
| `Escape` | always, rerouted | Cancels the pick, or releases the freeze if there is no pick |

It does **not** block `click` — the picker's own handler lives on `document` and
needs it — and it does not block pointer events outright, because you still have
to reach the row. It listens at `window` in the capture phase, so a page that
registered its own window-capture handler *before* injection can still win. That
is a known limit, not a bug. Auto-releases after five idle minutes, on
navigation, or on `Escape`.

## Changing this folder

- New cross-frame message → add the variant to `shared/messages.ts` **and** handle
  it in both the broadcast-down and bubble-up paths. Give it a deadline.
- Changing a budget (`COLLECTION_BUDGET_MS`, `MEASURE_BUDGET_MS`) → these are
  tuned for a scroll plus a couple of paints several frames deep. Lower them and
  slow frames start reporting as unreachable.
- Adding a file → add a row above, or `npm run check:docs` fails.

## Tests

`tests/e2e/extension.spec.ts` drives the real service worker and content script
over the real `chrome.*` path, including a pick inside an iframe, a pick inside a
shadow root, and freeze against a pane that genuinely closes three different
ways. `tests/e2e/roundtrip.spec.ts` covers the pick → rank → locator pipeline.
