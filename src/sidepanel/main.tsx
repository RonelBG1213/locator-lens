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
import { PomExport } from './components/PomExport.js';
import { SelectorEditor } from './components/SelectorEditor.js';
import {
  activeTabId,
  copyToClipboard,
  downloadText,
  ensureInjected,
  hasPersistentAccess,
  loadSettings,
  requestPersistentAccess,
  revokePersistentAccess,
  saveSettings,
  send,
} from './bridge.js';
import { PANEL_CSS } from './styles.js';
import { propertyName } from '../core/pom.js';
import { pageExpression } from '../shared/expression.js';
import { DEFAULT_SETTINGS } from '../shared/types.js';
import type { ContentToPanel } from '../shared/messages.js';
import type { Candidate, EvaluationResult, PickResult, SessionEntry, Settings } from '../shared/types.js';

/** Keeps typing responsive while still evaluating against the live page. */
const EVALUATE_DEBOUNCE_MS = 180;

function App() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<PickResult | null>(null);

  const [selector, setSelector] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const [session, setSession] = useState<SessionEntry[]>([]);
  const [pageName, setPageName] = useState('');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [persistent, setPersistent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<number>();

  const flash = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
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
      } else if (message.type === 'PSP_MODE_CHANGED') {
        setPicking(message.mode === 'pick');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

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
      const result = await send(tabId, { type: 'PSP_EVALUATE', selector: text });
      setEvaluation(result);
      // Only paint matches for a selector that actually resolved.
      await send(tabId, {
        type: 'PSP_HIGHLIGHT',
        selector: result && result.error === null ? text : null,
      });
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

  const addToSession = useCallback(
    (candidate: Candidate) => {
      if (!pick) return;
      const entry: SessionEntry = {
        name: propertyName({ accessibleName: pick.info.accessibleName, role: pick.info.role }),
        // Frame hops belong on the property, so the page object works from `page`.
        locator: pageExpression(pick.frameChain, candidate.locator).replace(/^page\./, ''),
        role: pick.info.role,
        accessibleName: pick.info.accessibleName,
      };
      setSession((current) => [...current, entry]);
      flash('Added to page object');
    },
    [pick, flash],
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
        <h1>Playwright Selector Picker</h1>
        {toast && <span class="badge plain">{toast}</span>}
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
            <span class="hint">Esc cancels. Alt+Shift+P toggles picking.</span>
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
              onCopy={copy}
              onHighlight={highlight}
              onAddToSession={addToSession}
            />
            <Inspector info={pick.info} raw={pick.raw} onCopy={copy} />
          </>
        )}

        {available !== false && (
          <SelectorEditor value={selector} result={evaluation} onChange={setSelector} />
        )}

        <PomExport
          pageName={pageName}
          entries={session}
          onPageNameChange={setPageName}
          onRemove={(index) => setSession((c) => c.filter((_, i) => i !== index))}
          onClear={() => setSession([])}
          onCopy={copy}
          onDownload={downloadText}
        />

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
    </>
  );
}

const style = document.createElement('style');
style.textContent = PANEL_CSS;
document.head.appendChild(style);

render(<App />, document.getElementById('app')!);
