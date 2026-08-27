/**
 * Panel styles, injected once at startup.
 *
 * Kept as a template string rather than a .css file so the whole panel builds to
 * a single JS bundle with no extra fetch and no CSP loader configuration.
 */
export const PANEL_CSS = `
  header {
    position: sticky; top: 0; z-index: 2;
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px;
    background: var(--bg);
    border-bottom: 1px solid var(--line);
  }
  header h1 { flex: 1; margin: 0; font-size: 13px; font-weight: 600; }
  /* Bottom padding leaves room for the version badge, which is fixed over it. */
  main { flex: 1; padding: 12px 12px 30px; display: flex; flex-direction: column; gap: 14px; }

  /* Fixed rather than in the flow: it should be legible without scrolling to the
     end of a long panel. pointer-events: none so it never eats a click. */
  .version {
    position: fixed; right: 8px; bottom: 6px; z-index: 3;
    font: 10px/1.4 var(--mono); color: var(--muted); opacity: .75;
    pointer-events: none; user-select: none;
  }

  button {
    font: inherit; color: var(--fg);
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 6px; padding: 5px 10px; cursor: pointer;
  }
  button:hover { border-color: var(--accent); }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button.primary[aria-pressed="true"] { background: var(--weak); border-color: var(--weak); }
  button.link {
    background: none; border: none; padding: 2px 4px;
    color: var(--muted); text-decoration: underline; cursor: pointer;
  }
  button.toggle { color: var(--muted); }
  button.toggle.on { color: var(--accent); border-color: var(--accent); font-weight: 600; }

  input[type="text"], input[type="search"] {
    width: 100%; font: 12px/1.5 var(--mono);
    color: var(--fg); background: var(--panel);
    border: 1px solid var(--line); border-radius: 6px; padding: 7px 9px;
  }
  input:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  section { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  section > h2 {
    display: flex; align-items: center; gap: 8px;
    margin: 0; padding: 8px 10px;
    font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase;
    color: var(--muted); background: var(--panel);
    border-bottom: 1px solid var(--line);
  }
  section > h2 .count { margin-left: auto; font-weight: 400; text-transform: none; letter-spacing: 0; }
  section > .body { padding: 10px; display: flex; flex-direction: column; gap: 8px; }

  .empty { color: var(--muted); padding: 24px 12px; text-align: center; }
  .hint { color: var(--muted); font-size: 12px; }
  .warn { color: var(--fair); font-size: 12px; }
  /* A standing notice for a mode that changes how the page behaves. */
  .frozen-note { margin: 0; padding: 8px 10px; border: 1px solid var(--fair); border-radius: 6px; }
  .error { color: var(--weak); font-size: 12px; font-family: var(--mono); }

  .candidate { border: 1px solid var(--line); border-radius: 6px; padding: 8px 9px; }
  .candidate.best { border-color: var(--accent); }
  .candidate .top { display: flex; align-items: center; gap: 8px; }
  .candidate code {
    flex: 1; font: 12px/1.45 var(--mono); word-break: break-all; cursor: pointer;
  }
  .candidate .why { margin: 6px 0 0; padding: 0; list-style: none; }
  .candidate .why li { color: var(--muted); font-size: 11.5px; }
  .candidate .why li::before { content: "− "; color: var(--weak); }

  .badge {
    flex-shrink: 0; padding: 1px 6px; border-radius: 999px;
    font-size: 10.5px; font-weight: 600; border: 1px solid currentColor;
  }
  .badge.strong { color: var(--strong); }
  .badge.fair { color: var(--fair); }
  .badge.weak { color: var(--weak); }
  .badge.plain { color: var(--muted); font-weight: 400; }

  .kv { display: grid; grid-template-columns: minmax(80px, auto) 1fr; gap: 3px 10px; font-size: 12px; }
  .kv dt { color: var(--muted); }
  .kv dd { margin: 0; font-family: var(--mono); word-break: break-all; }

  .attrs { max-height: 168px; overflow: auto; }
  .breadcrumb { font-family: var(--mono); font-size: 11px; color: var(--muted); word-break: break-all; }

  pre {
    margin: 0; padding: 9px; max-height: 260px; overflow: auto;
    background: var(--panel); border: 1px solid var(--line); border-radius: 6px;
    font: 11.5px/1.5 var(--mono); white-space: pre;
  }
  label.check {
    display: flex; align-items: center; gap: 7px;
    color: var(--muted); font-size: 12px; cursor: pointer;
  }
  label.check input { margin: 0; accent-color: var(--accent); cursor: pointer; }

  img.shot {
    display: block; max-width: 100%; height: auto;
    background: var(--panel);
    border: 1px solid var(--line); border-radius: 6px;
  }

  .row { display: flex; align-items: center; gap: 8px; }
  .row.wrap { flex-wrap: wrap; }
  .grow { flex: 1; }
`;
