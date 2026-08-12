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
import type { CaptureStart, EvaluationResult, PickResult } from '../../src/shared/types.js';

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
  expect(picked?.result?.candidates[0]?.locators).toEqual({
    javascript: "getByRole('button', { name: 'Save changes' })",
    python: 'get_by_role("button", name="Save changes")',
    java: 'getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Save changes"))',
    csharp: 'GetByRole(AriaRole.Button, new() { Name = "Save changes" })',
  });
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
  expect(chain[0]?.locators.javascript).toContain('frameLocator(');
  expect(chain[0]?.locators.python).toContain('frame_locator(');
  expect(picked?.result?.frameChainWarning).toBeUndefined();
  expect(picked?.result?.candidates[0]?.locators.javascript).toBe(
    "getByRole('button', { name: 'Save from frame' })",
  );

  // The full expression must work against real Playwright.
  const expression = `page.${chain.map((h) => h.locators.javascript).join('.')}.${picked!.result!.candidates[0]!.locators.javascript}`;
  const locator = new Function('page', `return ${expression};`)(page);
  await expect(locator).toHaveCount(1);
  await expect(locator).toHaveText('Save from frame');
});

/**
 * Java names its options class after the receiver. A pick inside an iframe is
 * chained onto a frameLocator(), so emitting `Page.GetByRoleOptions` there would
 * produce Java that does not compile — and nothing in CI compiles Java, so this
 * assertion is the only thing standing between that bug and a release.
 */
test('a pick inside an iframe names Java options for the FrameLocator receiver', async () => {
  const tabId = await openFixture('/kitchen-sink.html');
  const page = context.pages().at(-1)!;
  await clearReceived();

  await send(tabId, { type: 'PSP_SET_MODE', mode: 'pick' });
  await page.frameLocator('#modal-frame').locator('#frame-save').click();

  await expect.poll(async () => (await received()).length).toBeGreaterThan(0);

  const picked = (await received()).find((m) => m.type === 'PSP_PICKED');
  const java = picked?.result?.candidates[0]?.locators.java ?? '';

  expect(java).toContain('new FrameLocator.GetByRoleOptions()');
  expect(java).not.toContain('Page.GetByRoleOptions');
});

test('a pick in the top frame names Java options for the Page receiver', async () => {
  const tabId = await openFixture('/kitchen-sink.html');
  const page = context.pages().at(-1)!;
  await clearReceived();

  await send(tabId, { type: 'PSP_SET_MODE', mode: 'pick' });
  await page.click('#save-btn');

  await expect.poll(async () => (await received()).length).toBeGreaterThan(0);

  const picked = (await received()).find((m) => m.type === 'PSP_PICKED');
  expect(picked?.result?.candidates[0]?.locators.java).toContain('new Page.GetByRoleOptions()');
});

test.describe('live selector editor', () => {
  /** Evaluate through the real panel -> content script path. */
  async function evaluate(tabId: number, selector: string): Promise<EvaluationResult> {
    return (await send(tabId, { type: 'PSP_EVALUATE', selector })) as EvaluationResult;
  }

  test('returns Playwright-accurate counts through the message path', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const result = await evaluate(tabId, 'internal:role=button[name="Delete"i]');

    expect(result.target?.matchCount).toBe(2);
    expect(result.strictViolation).toBe(true);
    expect(result.target?.previews).toHaveLength(2);
  });

  test('accepts locator source, with and without the page. prefix', async () => {
    const tabId = await openFixture('/kitchen-sink.html');

    for (const input of [
      "getByRole('button', { name: 'Save changes' })",
      "page.getByRole('button', { name: 'Save changes' })",
      "getByTestId('order-total')",
    ]) {
      const result = await evaluate(tabId, input);
      expect(result.error, input).toBeNull();
      expect(result.target?.matchCount, input).toBe(1);
    }
  });

  test('reports a bare selector as 0 in the main frame but names the frame that matches', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    // The button exists only inside the iframe. Playwright would not find it from
    // `page`, so the target count must be 0 — but the panel should say where it is.
    const result = await evaluate(tabId, "getByRole('button', { name: 'Save from frame' })");

    expect(result.target?.matchCount).toBe(0);
    expect(result.otherFrames).toHaveLength(1);
    expect(result.otherFrames[0]?.matchCount).toBe(1);
    expect(result.otherFrames[0]?.frameChain[0]?.locators.javascript).toContain('frameLocator(');
  });

  test('routes a pasted frameLocator expression into that frame', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const result = await evaluate(
      tabId,
      "page.frameLocator('#modal-frame').getByRole('button', { name: 'Save from frame' })",
    );

    expect(result.error).toBeNull();
    expect(result.target?.matchCount).toBe(1);
    expect(result.target?.frameChain).toHaveLength(1);
    // Nothing left over: the main frame has no match to report as "elsewhere".
    expect(result.otherFrames).toEqual([]);
  });

  test('parses in whichever language PSP_SETTINGS last named', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const python = 'get_by_role("button", name="Save changes")';

    // The content script defaults to JavaScript, so this must not parse yet.
    expect((await evaluate(tabId, python)).error).not.toBeNull();

    try {
      await send(tabId, {
        type: 'PSP_SETTINGS',
        settings: { testIdAttributeName: 'data-testid', language: 'python' },
      });

      const result = await evaluate(tabId, python);
      expect(result.error).toBeNull();
      expect(result.target?.matchCount).toBe(1);

      // Raw selector syntax is language-neutral and must keep working regardless.
      expect((await evaluate(tabId, '#save-btn')).target?.matchCount).toBe(1);
    } finally {
      // The content script outlives this test; leave it as the others expect it.
      await send(tabId, {
        type: 'PSP_SETTINGS',
        settings: { testIdAttributeName: 'data-testid', language: 'javascript' },
      });
    }
  });

  test('does not sum matches across frames', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    // "Note" is a label inside the frame only; the main frame has none.
    const result = await evaluate(tabId, "getByLabel('Note')");

    expect(result.target?.matchCount).toBe(0);
    expect(result.otherFrames.reduce((n, f) => n + f.matchCount, 0)).toBe(1);
    // The authoritative number is the target's, never the total.
    expect(result.strictViolation).toBe(false);
  });

  test('reports an unmatched frameLocator hop as an error, not as zero matches', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const result = await evaluate(
      tabId,
      "page.frameLocator('#no-such-frame').getByRole('button')",
    );

    expect(result.target).toBeNull();
    expect(result.error).toContain('did not match exactly one frame');
  });

  test('reports invalid input as a parse error', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const result = await evaluate(tabId, 'getByRole(');

    expect(result.target).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain('\n');
  });
});

/**
 * Screenshot geometry.
 *
 * The image itself is the panel's job and needs a real toolbar click to get the
 * activeTab grant, so these tests cover the half that can be wrong in subtle
 * ways: where the extension thinks the element is. Playwright's own
 * `boundingBox()` is the oracle — it reports main-frame viewport coordinates,
 * which is exactly the coordinate space PSP_CAPTURE_BEGIN promises.
 */
test.describe('screenshot geometry', () => {
  /** Pick an element for real, so the content script holds the element it would shoot. */
  async function pick(tabId: number, click: () => Promise<void>): Promise<void> {
    await clearReceived();
    await send(tabId, { type: 'PSP_SET_MODE', mode: 'pick' });
    await click();
    await expect.poll(async () => (await received()).length).toBeGreaterThan(0);
  }

  async function beginCapture(
    tabId: number,
    target: 'element' | 'viewport',
    highlight = false,
  ): Promise<CaptureStart> {
    return (await send(tabId, {
      type: 'PSP_CAPTURE_BEGIN',
      target,
      highlight,
    })) as CaptureStart;
  }

  test('reports the picked element where Playwright sees it', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const page = context.pages().at(-1)!;
    await pick(tabId, () => page.click('#save-btn'));

    const started = await beginCapture(tabId, 'element');
    // Read the truth after the capture prepared the page: it scrolls the element
    // into view, which moves it.
    const expected = await page.locator('#save-btn').boundingBox();
    await send(tabId, { type: 'PSP_CAPTURE_END' });

    expect(started.ok).toBe(true);
    if (!started.ok) return;

    expect(started.geometry.rect.x).toBeCloseTo(expected!.x, 0);
    expect(started.geometry.rect.y).toBeCloseTo(expected!.y, 0);
    expect(started.geometry.rect.width).toBeCloseTo(expected!.width, 0);
    expect(started.geometry.rect.height).toBeCloseTo(expected!.height, 0);
  });

  test('folds the iframe offset into a pick made inside a frame', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const page = context.pages().at(-1)!;
    await pick(tabId, () => page.frameLocator('#modal-frame').locator('#frame-save').click());

    const started = await beginCapture(tabId, 'element');
    // boundingBox() on a frame's element is still main-frame relative, so an
    // un-translated frame-local rect would be visibly wrong here.
    const frame = page.frames().find((f) => f.url().includes('child-frame.html'))!;
    const expected = await frame.locator('#frame-save').boundingBox();
    await send(tabId, { type: 'PSP_CAPTURE_END' });

    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const frameBox = await page.locator('#modal-frame').boundingBox();
    // Guard the guard: if the iframe sat at the origin this test would pass with
    // the offset code deleted.
    expect(frameBox!.x + frameBox!.y).toBeGreaterThan(0);

    expect(started.geometry.rect.x).toBeCloseTo(expected!.x, 0);
    expect(started.geometry.rect.y).toBeCloseTo(expected!.y, 0);
  });

  test('reports the whole viewport for a viewport capture', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const page = context.pages().at(-1)!;

    const started = await beginCapture(tabId, 'viewport');
    await send(tabId, { type: 'PSP_CAPTURE_END' });

    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const inner = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
    expect(started.geometry.rect).toEqual({ x: 0, y: 0, width: inner.w, height: inner.h });
    expect(started.geometry.viewport).toEqual({ width: inner.w, height: inner.h });
  });

  test('marks the picked element on a viewport shot without scrolling to it', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const page = context.pages().at(-1)!;
    await pick(tabId, () => page.click('#save-btn'));

    const before = await page.evaluate(() => window.scrollY);
    const started = await beginCapture(tabId, 'viewport', true);
    const expected = await page.locator('#save-btn').boundingBox();
    await send(tabId, { type: 'PSP_CAPTURE_END' });

    expect(started.ok).toBe(true);
    if (!started.ok) return;

    expect(started.geometry.highlight?.x).toBeCloseTo(expected!.x, 0);
    expect(started.geometry.highlight?.y).toBeCloseTo(expected!.y, 0);
    expect(started.geometry.highlight?.width).toBeCloseTo(expected!.width, 0);
    // A viewport shot photographs the viewport the user is looking at. Scrolling
    // to find the element would photograph a different one.
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('leaves the highlight off when the picked element is out of view', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const page = context.pages().at(-1)!;
    await pick(tabId, () => page.click('#save-btn'));

    // Push the element far below the fold without moving the viewport.
    await page.evaluate(() => {
      document.body.style.paddingTop = '3000px';
      window.scrollTo(0, 0);
    });

    const started = await beginCapture(tabId, 'viewport', true);
    await send(tabId, { type: 'PSP_CAPTURE_END' });

    expect(started.ok).toBe(true);
    if (!started.ok) return;

    // The rect is still reported honestly — below the viewport — and the panel's
    // crop maths is what turns that into "no box drawn".
    expect(started.geometry.highlight!.y).toBeGreaterThan(started.geometry.viewport.height);
  });

  test('does not mark an element shot, which is already the element', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const page = context.pages().at(-1)!;
    await pick(tabId, () => page.click('#save-btn'));

    const started = await beginCapture(tabId, 'element', true);
    await send(tabId, { type: 'PSP_CAPTURE_END' });

    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.geometry.highlight ?? null).toBeNull();
  });

  test('hides the overlay in every frame while the shutter is open', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const page = context.pages().at(-1)!;
    const frame = page.frames().find((f) => f.url().includes('child-frame.html'))!;

    // Paint something in both frames, so there is an overlay to hide.
    await send(tabId, {
      type: 'PSP_HIGHLIGHT',
      selector: 'internal:role=button[name="Save from frame"i]',
    });
    await send(tabId, { type: 'PSP_HIGHLIGHT', selector: 'internal:role=button[name="Delete"i]' });

    const display = (target: typeof page | typeof frame) =>
      target
        .locator('#locator-lens-overlay')
        .evaluate((el) => (el as HTMLElement).style.display);

    await expect.poll(() => display(page)).toBe('');

    await beginCapture(tabId, 'viewport');
    expect(await display(page)).toBe('none');
    expect(await display(frame)).toBe('none');

    await send(tabId, { type: 'PSP_CAPTURE_END' });
    expect(await display(page)).toBe('');
    expect(await display(frame)).toBe('');
  });

  test('says so when the picked element is gone, and puts the overlay back', async () => {
    const tabId = await openFixture('/kitchen-sink.html');
    const page = context.pages().at(-1)!;
    await pick(tabId, () => page.click('#save-btn'));

    await send(tabId, { type: 'PSP_HIGHLIGHT', selector: 'internal:role=button[name="Delete"i]' });
    await page.evaluate(() => document.querySelector('#save-btn')!.remove());

    const started = await beginCapture(tabId, 'element');

    expect(started.ok).toBe(false);
    if (started.ok) return;
    expect(started.error).toContain('not on the page');

    // A failed capture must not leave the page unable to draw highlights.
    const display = await page
      .locator('#locator-lens-overlay')
      .evaluate((el) => (el as HTMLElement).style.display);
    expect(display).toBe('');
  });
});

test('the overlay does not leak into the page or its accessibility tree', async () => {
  const tabId = await openFixture('/kitchen-sink.html');
  const page = context.pages().at(-1)!;

  await send(tabId, { type: 'PSP_HIGHLIGHT', selector: 'internal:role=button[name="Delete"i]' });

  // A closed shadow root means the host page can see the container but nothing inside.
  const host = page.locator('#locator-lens-overlay');
  await expect(host).toHaveCount(1);
  expect(await host.evaluate((el) => el.shadowRoot)).toBeNull();
  // Nothing the picker draws should be findable as page content.
  await expect(page.getByText('matches — not unique')).toHaveCount(0);
});
