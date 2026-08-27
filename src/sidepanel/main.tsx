/**
 * Side panel entry point — owns all UI state and every call into the page.
 *
 * A side panel rather than a popup: a popup closes the moment you click into the
 * page, which makes element picking impossible.
 */
import { render } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { Candidates } from './components/Candidates.js';
import { Inspector } from './components/Inspector.js';
import { Screenshot } from './components/Screenshot.js';
import { SelectorEditor } from './components/SelectorEditor.js';
import {
  activeTabId,
  captureVisibleTab,
  copyImageToClipboard,
  copyToClipboard,
  downloadBlob,
  ensureInjected,
  hasPersistentAccess,
  loadSettings,
  requestPersistentAccess,
  revokePersistentAccess,
  saveSettings,
  send,
} from './bridge.js';
import { crop, type Shot } from './capture.js';
import { PANEL_CSS } from './styles.js';
import { DEFAULT_SETTINGS } from '../shared/types.js';
import type { ContentToPanel } from '../shared/messages.js';
import type {
  CaptureTarget,
  EvaluationResult,
  PickResult,
  Settings,
} from '../shared/types.js';

/** Keeps typing responsive while still evaluating against the live page. */
const EVALUATE_DEBOUNCE_MS = 180;

/**
 * Read from the manifest rather than a constant: the build stamps it from
 * package.json, so the number in the corner is always the version that was
 * actually packaged. Optional-chained because the store-asset renderer boots the
 * panel against a stubbed `chrome`.
 */
const VERSION = chrome.runtime.getManifest?.().version ?? '';

function App() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<PickResult | null>(null);

  const [selector, setSelector] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const [frozen, setFrozen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [persistent, setPersistent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [shot, setShot] = useState<Shot | null>(null);
  const [shotBusy, setShotBusy] = useState(false);
  const [shotError, setShotError] = useState<string | null>(null);
  const [shotHighlight, setShotHighlight] = useState(true);

  const toastTimer = useRef<number>();
  /** Object URLs are not garbage collected; the live one is tracked so it can be revoked. */
  const shotUrl = useRef<string | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  /** One shot is kept at a time, so the panel never holds more than one image. */
  const replaceShot = useCallback((next: Shot | null) => {
    if (shotUrl.current) URL.revokeObjectURL(shotUrl.current);
    shotUrl.current = next?.url ?? null;
    setShot(next);
    setShotError(null);
  }, []);

  // ------------------------------------------------------------- connection

  const connect = useCallback(async () => {
    const id = await activeTabId();
    setTabId(id);
    if (id === null) {
      setAvailable(false);
      return;
    }
    await ensureInjected(id);
    const pong = await send(id, { type: 'PSP_PING' });
    setAvailable(pong !== null);
    // A navigation re-injects a fresh content script, which starts unfrozen. The
    // page is the authority on that, never the panel's own memory of it.
    setFrozen(pong?.frozen === true);
    if (pong) await send(id, { type: 'PSP_SETTINGS', settings });
  }, [settings]);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void hasPersistentAccess().then(setPersistent);
  }, []);

  useEffect(() => {
    void connect();
  }, [connect]);

  // Reconnect when the user switches tabs or the page navigates away.
  useEffect(() => {
    const onActivated = () => void connect();
    const onUpdated = (id: number, change: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && change.status === 'complete') {
        setPicking(false);
        void connect();
      }
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [connect, tabId]);

  // ---------------------------------------------------- messages from a pick

  useEffect(() => {
    const listener = (message: ContentToPanel) => {
      if (message.type === 'PSP_PICKED') {
        setPick(message.result);
        setPicking(false);
        // The old shot is a picture of a different element now.
        replaceShot(null);
      } else if (message.type === 'PSP_MODE_CHANGED') {
        setPicking(message.mode === 'pick');
      } else if (message.type === 'PSP_FROZEN_CHANGED') {
        // Freeze can change without the panel: the shortcut, Escape, or the
        // watchdog releasing a forgotten one.
        setFrozen(message.frozen);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [replaceShot]);

  // ------------------------------------------------------- live selector box

  useEffect(() => {
    if (tabId === null) return;

    const text = selector.trim();
    if (!text) {
      setEvaluation(null);
      void send(tabId, { type: 'PSP_HIGHLIGHT', selector: null });
      return;
    }

    const timer = window.setTimeout(async () => {
      // The content script highlights as part of evaluating, in every frame the
      // selector reaches — so no separate highlight round trip here.
      setEvaluation(await send(tabId, { type: 'PSP_EVALUATE', selector: text }));
      await send(tabId, { type: 'PSP_HIGHLIGHT', selector: text });
    }, EVALUATE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [selector, tabId]);

  // ---------------------------------------------------------------- actions

  const togglePick = useCallback(async () => {
    if (tabId === null) return;
    const next = picking ? 'idle' : 'pick';
    const ok = await send(tabId, { type: 'PSP_SET_MODE', mode: next });
    if (ok) setPicking(next === 'pick');
    else setAvailable(false);
  }, [picking, tabId]);

  const toggleFreeze = useCallback(async () => {
    if (tabId === null) return;
    const answer = await send(tabId, { type: 'PSP_SET_FROZEN', frozen: !frozen });
    if (answer) setFrozen(answer.frozen);
    else setAvailable(false);
  }, [frozen, tabId]);

  const highlight = useCallback(
    (value: string | null) => {
      if (tabId !== null) void send(tabId, { type: 'PSP_HIGHLIGHT', selector: value });
    },
    [tabId],
  );

  const copy = useCallback(
    (text: string) => {
      void copyToClipboard(text).then(() => flash('Copied'));
    },
    [flash],
  );

  /**
   * Photograph the page in three beats: get it ready (overlay hidden, element
   * scrolled into view, rect measured), take the picture, put the page back.
   *
   * The third beat is in a finally for a reason — if the capture throws, the page
   * would otherwise be left unable to draw its highlights until the content
   * script's own watchdog fires.
   */
  const capture = useCallback(
    async (target: CaptureTarget) => {
      if (tabId === null) return;
      setShotBusy(true);
      setShotError(null);

      // Only a viewport shot gets a box; an element shot is already the element,
      // and an outline would sit on top of the edges you want to see.
      const highlight = target === 'viewport' && shotHighlight && pick !== null;

      try {
        const started = await send(tabId, { type: 'PSP_CAPTURE_BEGIN', target, highlight });
        if (!started) {
          setShotError('Lost contact with the page. Click the toolbar icon to reconnect.');
          return;
        }
        if (!started.ok) {
          setShotError(started.error);
          return;
        }

        const dataUrl = await captureVisibleTab(tabId);
        if (!dataUrl) {
          setShotError(
            'Chrome would not capture this tab. Click the toolbar icon to reconnect, or turn on “Stay connected” below.',
          );
          return;
        }

        replaceShot(await crop(dataUrl, started.geometry, { target, highlight }));
      } catch (error) {
        setShotError(error instanceof Error ? error.message : 'The screenshot failed.');
      } finally {
        await send(tabId, { type: 'PSP_CAPTURE_END' });
        setShotBusy(false);
      }
    },
    [tabId, replaceShot, shotHighlight, pick],
  );

  const copyImage = useCallback(
    (blob: Blob) => {
      void copyImageToClipboard(blob).then(
        () => flash('Image copied'),
        () => flash('Clipboard refused the image'),
      );
    },
    [flash],
  );

  const updateSettings = useCallback(
    async (next: Settings) => {
      setSettings(next);
      await saveSettings(next);
      if (tabId !== null) await send(tabId, { type: 'PSP_SETTINGS', settings: next });
    },
    [tabId],
  );

  // ------------------------------------------------------------------- view

  return (
    <>
      <header>
        <h1>Locator Lens</h1>
        {toast && <span class="badge plain">{toast}</span>}
        <button
          class={frozen ? 'toggle on' : 'toggle'}
          aria-pressed={frozen}
          disabled={available === false}
          title="Stop dropdowns and popup LOVs from closing while you pick (Alt+Shift+F)"
          onClick={() => void toggleFreeze()}
        >
          {frozen ? 'Frozen' : 'Freeze'}
        </button>
        <button
          class="primary"
          aria-pressed={picking}
          disabled={available === false}
          onClick={() => void togglePick()}
        >
          {picking ? 'Stop picking' : 'Pick element'}
        </button>
      </header>

      <main>
        {frozen && (
          <p class="warn frozen-note">
            Frozen — the page cannot close its dropdowns, and its focus handlers are
            suspended. Press Esc on the page, or Freeze again, to release it.
          </p>
        )}

        {available === false && (
          <p class="empty">
            Can’t reach this page. Chrome blocks extensions on <code>chrome://</code> pages, the Web
            Store and PDF viewer. Open a normal page, then click the toolbar icon again.
          </p>
        )}

        {available !== false && !pick && !picking && (
          <p class="empty">
            Click <strong>Pick element</strong>, then click anything on the page.
            <br />
            <span class="hint">
              Esc cancels. Alt+Shift+P toggles picking, Alt+Shift+F freezes the page so a
              dropdown stays open.
            </span>
          </p>
        )}

        {picking && <p class="empty">Click an element on the page… (Esc to cancel)</p>}

        {pick && (
          <>
            <Candidates
              candidates={pick.candidates}
              frameChain={pick.frameChain}
              frameChainWarning={pick.frameChainWarning}
              retarget={pick.retarget}
              shadow={pick.info.shadow}
              onCopy={copy}
              onHighlight={highlight}
            />
            <Inspector info={pick.info} raw={pick.raw} onCopy={copy} />
          </>
        )}

        {available !== false && (
          <SelectorEditor
            value={selector}
            result={evaluation}
            onChange={setSelector}
            onUse={setSelector}
          />
        )}

        {available !== false && (
          <Screenshot
            info={pick?.info ?? null}
            shot={shot}
            busy={shotBusy}
            error={shotError}
            highlight={shotHighlight}
            onHighlightChange={setShotHighlight}
            onCapture={(target) => void capture(target)}
            onCopy={copyImage}
            onDownload={downloadBlob}
            onClear={() => replaceShot(null)}
          />
        )}

        <section>
          <h2>Settings</h2>
          <div class="body">
            <div class="row">
              <span class="grow hint">
                {persistent
                  ? 'Connected across navigations for all sites.'
                  : 'Chrome drops access when the page navigates to another site — click the toolbar icon again to reconnect.'}
              </span>
              <button
                onClick={async () => {
                  // Must run inside the click handler: Chrome requires a gesture.
                  const granted = persistent
                    ? !(await revokePersistentAccess())
                    : await requestPersistentAccess();
                  setPersistent(granted);
                  if (granted) void connect();
                }}
              >
                {persistent ? 'Revoke access' : 'Stay connected'}
              </button>
            </div>

            <label class="hint" for="testid">
              Test ID attribute — must match <code>use.testIdAttribute</code> in your Playwright
              config.
            </label>
            <input
              id="testid"
              type="text"
              spellcheck={false}
              value={settings.testIdAttributeName}
              onChange={(event) =>
                void updateSettings({
                  testIdAttributeName:
                    (event.target as HTMLInputElement).value.trim() ||
                    DEFAULT_SETTINGS.testIdAttributeName,
                })
              }
            />
          </div>
        </section>
      </main>

      {VERSION && <span class="version">v.{VERSION}</span>}
    </>
  );
}

const style = document.createElement('style');
style.textContent = PANEL_CSS;
document.head.appendChild(style);

render(<App />, document.getElementById('app')!);
