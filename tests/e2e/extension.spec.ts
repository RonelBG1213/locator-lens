/**
 * Integration test for the packaged extension.
 *
 * Drives the real service worker and the real content script over the real
 * chrome.* messaging path — everything the side panel does, minus the UI, which
 * Playwright cannot open. Complements roundtrip.spec.ts: that one proves the
 * selectors are right, this one proves the plumbing that delivers them works.
 */
import { test, expect, chromium, type BrowserContext, type Worker } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL } from '../../playwright.config.js';
import type { PickResult } from '../../src/shared/types.js';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

let context: BrowserContext;
let worker: Worker;
let profile: string;
let extensionDir: string;

/**
 * Load a copy of dist/ whose manifest has <all_urls> promoted from optional to
 * granted.
 *
 * The shipped extension gets host access either from `activeTab` (a toolbar
 * click) or from the user accepting the optional permission in the panel.
 * Playwright can do neither — it cannot click browser chrome, and
 * `permissions.request()` needs a user gesture. Pre-granting the same permission
 * the user would grant keeps every line of extension code under test; only the
 * consent step is bypassed.
 */
function stageExtension(): string {
  const dir = mkdtempSync(join(tmpdir(), 'psp-ext-'));
  cpSync(DIST, dir, { recursive: true });

  const manifestPath = join(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  delete manifest.optional_host_permissions;
  manifest.host_permissions = ['<all_urls>'];
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return dir;
}

test.beforeAll(async () => {
  if (!existsSync(join(DIST, 'manifest.json')))
    throw new Error('dist/ is missing. Run `npm run build` before the e2e suite.');

  extensionDir = stageExtension();
  profile = mkdtempSync(join(tmpdir(), 'psp-profile-'));
  context = await chromium.launchPersistentContext(profile, {
    // Extensions require the full browser, not the headless shell.
    channel: 'chromium',
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  });

  worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));

  // Collect what the content script would send to the side panel.
  await worker.evaluate(() => {
    (globalThis as any).__received = [];
    chrome.runtime.onMessage.addListener((message) => {
      (globalThis as any).__received.push(message);
    });
  });
});

test.afterAll(async () => {
  await context?.close();
  for (const dir of [profile, extensionDir])
    if (dir) rmSync(dir, { recursive: true, force: true });
});

/** Everything the content script has sent to the panel so far. */
async function received(): Promise<Array<{ type: string; result?: PickResult }>> {
  return worker.evaluate(() => (globalThis as any).__received);
}

async function clearReceived(): Promise<void> {
  await worker.evaluate(() => ((globalThis as any).__received = []));
}

/**
 * Inject via the service worker's real code path and return the tab id.
 *
 * Resolves the tab by active/currentWindow rather than by URL: the extension
 * holds no host permissions, so `chrome.tabs.query({ url })` matches nothing and
 * `tab.url` is redacted. This is the same lookup the side panel performs.
 */
async function openFixture(path: string): Promise<number> {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}${path}`);
  await page.bringToFront();

  return worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('no active tab');
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['content.js'],
    });
    return tab.id;
  });
}

async function send(tabId: number, message: unknown): Promise<unknown> {
  return worker.evaluate(
    ([id, msg]) => chrome.tabs.sendMessage(id as number, msg, { frameId: 0 }),
    [tabId, message] as const,
  );
}

test('the content script injects and answers a ping', async () => {
  const tabId = await openFixture('/kitchen-sink.html');
  const pong = (await send(tabId, { type: 'PSP_PING' })) as { ok: boolean; url: string };

  expect(pong.ok).toBe(true);
  expect(pong.url).toContain('kitchen-sink.html');
});

test('clicking in pick mode reports a ranked result and suppresses the page click', async () => {
  const tabId = await openFixture('/kitchen-sink.html');
  const page = context.pages().at(-1)!;
  await clearReceived();

  await send(tabId, { type: 'PSP_SET_MODE', mode: 'pick' });
  await page.click('#save-btn');

  await expect.poll(async () => (await received()).length).toBeGreaterThan(0);

  const picked = (await received()).find((m) => m.type === 'PSP_PICKED');
  expect(picked?.result?.candidates[0]?.locator).toBe("getByRole('button', { name: 'Save changes' })");
  expect(picked?.result?.info.role).toBe('button');
  expect(picked?.result?.frameChain).toEqual([]);
});

test('picking a link does not navigate away from the page', async () => {
  const tabId = await openFixture('/kitchen-sink.html');
  const page = context.pages().at(-1)!;
  const before = page.url();
  await clearReceived();

  await send(tabId, { type: 'PSP_SET_MODE', mode: 'pick' });
  await page.click('#clean a');

  await expect.poll(async () => (await received()).length).toBeGreaterThan(0);
  // The fixture link points at #somewhere; a leaked click would change the URL.
  expect(page.url()).toBe(before);
});

test('a pick inside an iframe carries a frameLocator hop', async () => {
  const tabId = await openFixture('/kitchen-sink.html');
  const page = context.pages().at(-1)!;
  await clearReceived();

  await send(tabId, { type: 'PSP_SET_MODE', mode: 'pick' });
  await page.frameLocator('#modal-frame').locator('#frame-save').click();

  await expect.poll(async () => (await received()).length).toBeGreaterThan(0);

  const picked = (await received()).find((m) => m.type === 'PSP_PICKED');
  const chain = picked?.result?.frameChain ?? [];

  expect(chain).toHaveLength(1);
  expect(chain[0]?.locator).toContain('frameLocator(');
  expect(picked?.result?.frameChainWarning).toBeUndefined();
  expect(picked?.result?.candidates[0]?.locator).toBe("getByRole('button', { name: 'Save from frame' })");

  // The full expression must work against real Playwright.
  const expression = `page.${chain.map((h) => h.locator).join('.')}.${picked!.result!.candidates[0]!.locator}`;
  const locator = new Function('page', `return ${expression};`)(page);
  await expect(locator).toHaveCount(1);
  await expect(locator).toHaveText('Save from frame');
});

test('evaluating a selector returns Playwright-accurate counts through the message path', async () => {
  const tabId = await openFixture('/kitchen-sink.html');

  const ambiguous = (await send(tabId, {
    type: 'PSP_EVALUATE',
    selector: 'internal:role=button[name="Delete"i]',
  })) as { matchCount: number; strictViolation: boolean; previews: string[] };

  expect(ambiguous.matchCount).toBe(2);
  expect(ambiguous.strictViolation).toBe(true);
  expect(ambiguous.previews).toHaveLength(2);
});

test('the overlay does not leak into the page or its accessibility tree', async () => {
  const tabId = await openFixture('/kitchen-sink.html');
  const page = context.pages().at(-1)!;

  await send(tabId, { type: 'PSP_HIGHLIGHT', selector: 'internal:role=button[name="Delete"i]' });

  // A closed shadow root means the host page can see the container but nothing inside.
  const host = page.locator('#playwright-selector-picker-overlay');
  await expect(host).toHaveCount(1);
  expect(await host.evaluate((el) => el.shadowRoot)).toBeNull();
  // Nothing the picker draws should be findable as page content.
  await expect(page.getByText('matches — not unique')).toHaveCount(0);
});
