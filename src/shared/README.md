# src/shared

Message contracts, domain types, and the one renderer both sides need. Imported
by all three bundles.

**Boundary:** imports **nothing** but itself. No `chrome.*` calls, no DOM, no
engine. A dependency added here lands in `content.js`, `background.js` *and*
`sidepanel.js` at once — which is why this folder stays empty of them.

## Files

| File | Role | Key exports |
| --- | --- | --- |
| `types.ts` | Domain types shared by both sides and the tests | `Candidate`, `ElementInfo`, `PickResult`, `FrameHop`, `Settings`, `DEFAULT_SETTINGS` |
| `messages.ts` | The panel ↔ content ↔ frame message contracts | `PanelToContent`, `ContentToPanel`, `ContentResponses`, `FrameMessage`, `isFrameMessage()` |
| `expression.ts` | Renders a pick as the expression you paste into a test | `pageExpression()` |

## Invariants

- **A change here is always a two-side change.** Every message type has a sender
  and a handler in different bundles. Adding a variant without handling it
  typechecks on the sending side and fails silently at runtime.
- **`expression.ts` stays pure and dependency-free.** Both the content script and
  the panel render expressions; if it reached for the engine, the panel would
  pull in the ~300KB injected bundle to format a string.
- **`isFrameMessage()` is the trust boundary for `window.postMessage`.** Frame
  messages arrive from arbitrary windows, including hostile pages. Every inbound
  message must go through it — never trust `event.data` shape directly.
- **`LocatorKind` drives base scoring** in `core/rules.ts`. Adding a kind without
  adding it to `KIND_SCORE` and `KIND_RATIONALE` is a type error; keep it that
  way rather than defaulting.

## Changing this folder

- New message → add the variant, then handle it in `content/index.ts` and, if the
  panel sends it, wrap it in `sidepanel/bridge.ts`. Cross-frame variants need a
  deadline field; see [`src/content/`](../content/README.md).
- New setting → add to `Settings` **and** `DEFAULT_SETTINGS`. Settings live in
  `chrome.storage.sync`, so keep values small — never an image.
- Adding a file → add a row above, or `npm run check:docs` fails.

## Tests

No dedicated suite; this folder is types and one pure function. It is exercised
by every other test, and `npm run typecheck` is the real gate — a broken contract
here fails compilation rather than a test.
