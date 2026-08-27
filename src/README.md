# src/

Source for the extension's three bundles. Everything here is TypeScript except
`vendor/`, which is generated JavaScript.

This file is the map and the rules *between* folders. Each folder's own
`README.md` covers what is inside it. For what the product does and why, see the
[root README](../README.md).

## Folders

| Folder | Role | Ships in |
| --- | --- | --- |
| [`vendor/`](vendor/README.md) | Playwright's engine, extracted at build time. **Generated — never edit** | `content.js` |
| [`engine/`](engine/README.md) | The only wrapper around the injected script: bootstrap, generate, query, inspect | `content.js` |
| [`core/`](core/README.md) | Pure logic — ranking, rules, selector text, crop geometry. No browser | `content.js`, `sidepanel.js` |
| [`content/`](content/README.md) | Picker state machine, overlay, freeze shield, frame chain | `content.js` |
| [`sidepanel/`](sidepanel/README.md) | Preact UI, the `chrome.*` bridge, screenshot cropping | `sidepanel.js` |
| [`shared/`](shared/README.md) | Message contracts, domain types, expression renderer | all three |
| [`background/`](background/README.md) | Service worker: opens the panel, injects the content script | `background.js` |

## Dependency direction

```
vendor  <--  engine  <--\
                         >--  content  |  sidepanel
shared  <--  core    <--/

background  -->  (nothing)
```

Arrows point the way imports go. Three rules hold today and are worth keeping:

1. **`shared/` imports nothing but itself.** It is the one folder both bundles
   pull in, so a dependency here lands in all three outputs.
2. **`core/` imports only `shared/`** (plus its one vendored parser, below). This
   is what lets `tests/unit/` run it in plain Node with no DOM.
3. **`background/` imports nothing at all.** If the service worker starts needing
   a module, question the change — it is meant to be thin. See its doc.

## The vendored engine has exactly one importer per piece

Two things are vendored, and each is reached through a single file. Keep it that
way: it is what makes an engine upgrade a four-file review instead of a hunt.

| Vendored file | Sole importer | Why it may live there |
| --- | --- | --- |
| `vendor/injectedScript.generated.js` | `engine/bootstrap.ts` | Browser-only, ~300KB. Confining it keeps it out of `sidepanel.js` |
| `vendor/locatorParser.generated.js` | `core/locatorInput.ts` | Isomorphic — plain Node, no DOM. That is why the live editor's parsing is unit-testable |

Verify both at any time:

```bash
grep -rl "injectedScript.generated" src --include=*.ts   # -> engine/bootstrap.ts
grep -rl "locatorParser.generated"  src --include=*.ts   # -> core/locatorInput.ts
```

The second one is the surprise: `core/` is otherwise engine-free. The parser is
allowed in because it is ordinary isomorphic CJS, not the injected bundle — the
distinction the [root README](../README.md#why-no-eval) draws between the two
vendored pieces.

## `chrome.*` is a boundary too

Only `background/`, `content/` and `sidepanel/` may call the extension APIs.
`core/`, `engine/` and `shared/` have zero `chrome.*` calls and must keep it that
way — that is the property their tests depend on.

```bash
# Comments mention chrome.* freely; this looks for calls.
grep -rn 'chrome\.' src/core src/engine src/shared --include=*.ts | grep -vE '^\S+:\s*\*|\*'
```

## Adding a file

Add a row to the owning folder's `## Files` table in the same commit, or
`npm run check:docs` fails the build and names the file. That check is what stops
these docs rotting; see [`scripts/check-docs.mjs`](../scripts/check-docs.mjs).
