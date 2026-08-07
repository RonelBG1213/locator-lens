/**
 * Renders the Chrome Web Store graphic assets into assets/store/.
 *
 *   npm run store:assets        (requires `npm run build` first)
 *
 * The store wants exact pixel sizes, so these are laid out in HTML and captured
 * with the Chromium already installed for the e2e suite, rather than drawn by
 * hand in an image editor and re-exported every time a word changes. Re-running
 * this is how you keep the tiles in step with the listing copy.
 *
 * The screenshots frame the REAL built side panel (dist/sidepanel.html) in an
 * iframe — not a mockup. `chrome.*` is stubbed, because outside the extension it
 * does not exist and the panel dies on boot, and one representative pick is
 * pushed through the panel's own message path so the shots show the populated UI.
 * The pixels are the product; only the picked element is staged. See DEMO_PICK.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(root, 'assets/store');
const panel = resolve(root, 'dist/sidepanel.html');

if (!existsSync(panel)) throw new Error('Missing dist/sidepanel.html. Run `npm run build` first.');

mkdirSync(outdir, { recursive: true });

// Sampled from assets/icons/icon-master.png so the tiles and the icon read as
// one thing in the search results, where they appear side by side.
const INK = '#0e1116';
const INK_2 = '#161b22';
const GREEN = '#3fbf46';
const TEXT = '#e6edf3';
const MUTED = '#8b949e';

const iconDataUri = `data:image/png;base64,${readFileSync(resolve(root, 'assets/icons/icon-master.png')).toString('base64')}`;

const FONT = `'Segoe UI', system-ui, -apple-system, sans-serif`;
const MONO = `'Cascadia Mono', Consolas, ui-monospace, monospace`;

const shell = (w, h, body) => `<!doctype html>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
  body {
    font-family: ${FONT};
    color: ${TEXT};
    background: radial-gradient(120% 120% at 15% 0%, ${INK_2} 0%, ${INK} 60%);
    display: flex;
  }
  .mono { font-family: ${MONO}; }
  .green { color: ${GREEN}; }
</style>
${body}`;

/* Small promo tile — 440x280. Appears at roughly half size in listings, so this
   carries the mark, the name and five words. Anything more is unreadable. */
const smallTile = shell(
  440,
  280,
  `<div style="display:flex;flex-direction:column;justify-content:center;gap:18px;padding:38px 40px;width:100%">
     <img src="${iconDataUri}" width="72" height="72" style="border-radius:16px">
     <div>
       <div style="font-size:38px;font-weight:700;letter-spacing:-0.6px;line-height:1.1">Locator Lens</div>
       <div style="font-size:17px;color:${MUTED};margin-top:8px">Click an element.<br>Get the Playwright locator.</div>
     </div>
     <div class="mono" style="font-size:12px;color:${GREEN};opacity:.9">page.getByRole('button', { name: 'Save' })</div>
   </div>`,
);

/* Marquee tile — 1400x560. Only used if the item is ever featured, but it costs
   one render and cannot be added retroactively to a promotion. */
const marqueeTile = shell(
  1400,
  560,
  `<div style="display:flex;align-items:center;gap:88px;padding:0 96px;width:100%">
     <div style="flex:1;display:flex;flex-direction:column;gap:26px">
       <img src="${iconDataUri}" width="104" height="104" style="border-radius:24px">
       <div style="font-size:76px;font-weight:700;letter-spacing:-1.6px;line-height:1">Locator Lens</div>
       <div style="font-size:27px;color:${MUTED};line-height:1.45;max-width:20ch">
         Ranked, verified Playwright locators — straight from Playwright's own engine.
       </div>
     </div>
     <div style="flex:1;display:flex;flex-direction:column;gap:14px">
       ${[
         ['100', `page.getByRole('button', { name: 'Save' })`, '1 match · codegen default'],
         ['80', `page.getByTestId('save-btn')`, '1 match'],
         ['25', `page.locator('.btn.btn-primary:nth-child(2)')`, '6 matches · strict mode would throw'],
       ]
         .map(
           ([score, code, meta], i) => `
       <div style="display:flex;gap:18px;align-items:center;background:rgba(255,255,255,.04);
                   border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:18px 22px;
                   opacity:${1 - i * 0.18}">
         <div style="font-size:26px;font-weight:700;min-width:52px;
                     color:${i === 0 ? GREEN : i === 1 ? '#d9a441' : '#d4595b'}">${score}</div>
         <div style="min-width:0">
           <div class="mono" style="font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${code
             .replace(/</g, '&lt;')
             .replace(/'/g, '&#39;')}</div>
           <div style="font-size:13px;color:${MUTED};margin-top:5px">${meta}</div>
         </div>
       </div>`,
         )
         .join('')}
     </div>
   </div>`,
);

/**
 * A representative pick, in the panel's own wire shape (`PickResult` in
 * src/shared/types.ts) — a Save button on a checkout form.
 *
 * Staged demo data, not a live capture: the panel outside the extension has no
 * page to pick from. The scores and reasons are the ones the real rules table
 * produces for this element (role 100; testid 80; a css path 25 less the 45-point
 * nth-index penalty, floored at 0 and demoted for being ambiguous), so the
 * picture shows what the tool actually does rather than a flattering invention.
 */
const DEMO_PICK = {
  candidates: [
    {
      selector: 'internal:role=button[name="Save"i]',
      locator: `getByRole('button', { name: 'Save' })`,
      kind: 'role',
      matchCount: 1,
      score: 100,
      penalties: [],
      isCodegenDefault: true,
    },
    {
      selector: 'internal:testid=[data-testid="save-btn"s]',
      locator: `getByTestId('save-btn')`,
      kind: 'testid',
      matchCount: 1,
      score: 80,
      penalties: [],
      isCodegenDefault: false,
    },
    {
      selector: 'internal:text="Save"i',
      locator: `getByText('Save')`,
      kind: 'text',
      matchCount: 1,
      score: 50,
      penalties: [],
      isCodegenDefault: false,
    },
    {
      selector: 'form.checkout > div:nth-child(3) > button.btn.btn-primary',
      locator: `locator('form.checkout > div:nth-child(3) > button.btn.btn-primary')`,
      kind: 'css',
      matchCount: 1,
      score: 0,
      penalties: [
        { id: 'nth-index', reason: 'Uses a positional index — reorders break it', cost: 45 },
        { id: 'styling-class', reason: 'Targets a styling class — changes with the design', cost: 25 },
      ],
      isCodegenDefault: false,
    },
  ],
  info: {
    tagName: 'button',
    role: 'button',
    accessibleName: 'Save',
    accessibleDescription: '',
    text: 'Save',
    attributes: [
      { name: 'type', value: 'submit' },
      { name: 'class', value: 'btn btn-primary' },
      { name: 'data-testid', value: 'save-btn' },
    ],
    visible: true,
    enabled: true,
    editable: false,
    checked: null,
    ancestry: ['body', 'main', 'form.checkout', 'div.actions'],
    boundingBox: { x: 412, y: 596, width: 96, height: 36 },
  },
  raw: {
    css: 'form.checkout > div:nth-child(3) > button.btn.btn-primary',
    xpath: "/html/body/main/form/div[3]/button",
    axisCss: '#checkout-form button.btn-primary',
    axisXpath: "//*[@id='checkout-form']/descendant::button[@type='submit']",
    anchor: '#checkout-form, 2 levels up',
  },
  frameChain: [],
};

/* Store screenshot — 1280x800, the one asset the store will not publish without.
   The panel is the real built UI in an iframe at its true 400px width. */
const screenshot = (headline, sub) =>
  shell(
    1280,
    800,
    `<div style="display:flex;align-items:center;gap:80px;padding:0 84px;width:100%">
       <div style="flex:1;display:flex;flex-direction:column;gap:22px">
         <img src="${iconDataUri}" width="64" height="64" style="border-radius:14px">
         <div style="font-size:46px;font-weight:700;letter-spacing:-1px;line-height:1.15">${headline}</div>
         <div style="font-size:21px;color:${MUTED};line-height:1.5;max-width:26ch">${sub}</div>
       </div>
       <div style="width:400px;height:660px;border-radius:14px;overflow:hidden;
                   border:1px solid rgba(255,255,255,.1);box-shadow:0 30px 80px rgba(0,0,0,.55)">
         <iframe src="sidepanel.html" style="width:400px;height:660px;border:0"></iframe>
       </div>
     </div>`,
  );

/** `scroll` is text in the panel to bring into view before the shutter opens. */
const assets = [
  { file: 'promo-small-440x280.png', w: 440, h: 280, html: smallTile },
  { file: 'promo-marquee-1400x560.png', w: 1400, h: 560, html: marqueeTile },
  {
    file: 'screenshot-1-1280x800.png',
    w: 1280,
    h: 800,
    pick: true,
    html: screenshot(
      'Every locator, scored and explained',
      "Ranked candidates with each deduction named — and match counts from Playwright's own resolver, not a guess at one.",
    ),
  },
  {
    file: 'screenshot-2-1280x800.png',
    w: 1280,
    h: 800,
    pick: true,
    scroll: 'Element',
    html: screenshot(
      'Nothing about the ranking is magic',
      'Computed role, accessible name, every attribute and a DOM breadcrumb — the exact inputs the score was derived from.',
    ),
  },
  {
    file: 'screenshot-3-1280x800.png',
    w: 1280,
    h: 800,
    pick: true,
    scroll: 'Try a selector',
    html: screenshot(
      'Check a locator before you paste it',
      'Type any locator — page. prefix and frameLocator() chains included — and see the match count and every match highlighted, live.',
    ),
  },
];

/**
 * The panel is real extension code, so it goes looking for `chrome.*` the moment
 * it boots. Outside the extension that object does not exist and the panel dies
 * before painting. This is the minimum surface it touches (grep `chrome\.` under
 * src/sidepanel/), stubbed to the "nothing picked yet" answers — which is the
 * state a new user opens the panel in anyway.
 */
const CHROME_STUB = () => {
  const evt = () => ({ addListener: () => {}, removeListener: () => {} });
  const tab = { id: 1, url: 'https://example.com/checkout', title: 'Checkout' };

  // The panel subscribes to runtime.onMessage to receive a pick. Holding the
  // listeners here is what lets the capture push a PSP_PICKED through the real
  // code path, so the screenshots show the populated UI rather than an empty one.
  const listeners = [];
  globalThis.__deliver = (message) => listeners.forEach((l) => l(message));

  globalThis.chrome = {
    runtime: {
      id: 'store-asset-render',
      onMessage: {
        addListener: (l) => listeners.push(l),
        removeListener: (l) => listeners.splice(listeners.indexOf(l), 1),
      },
      sendMessage: async () => undefined,
    },
    // get() is handed a defaults object; echoing it back is what an unset
    // profile returns, so the panel shows `data-testid` rather than a blank.
    storage: { sync: { get: async (defaults) => defaults ?? {}, set: async () => {} } },
    permissions: { contains: async () => false, request: async () => false, remove: async () => false },
    tabs: {
      query: async () => [tab],
      get: async () => tab,
      // A null answer to PSP_PING is how the panel decides a page is off-limits
      // and paints its "can't reach this page" state instead of the UI.
      sendMessage: async (_id, message) => (message?.type === 'PSP_PING' ? { ok: true } : undefined),
      captureVisibleTab: async () => '',
      onActivated: evt(),
      onUpdated: evt(),
    },
  };
};

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });
await context.addInitScript(CHROME_STUB);
const page = await context.newPage();

// Staged inside dist/ rather than passed to setContent: an about:blank page may
// not frame a file:// document, and same-directory keeps the iframe src relative.
const stage = resolve(root, 'dist/.store-asset-stage.html');

for (const { file, w, h, html, pick, scroll } of assets) {
  await page.setViewportSize({ width: w, height: h });
  writeFileSync(stage, html);
  await page.goto(pathToFileURL(stage).href, { waitUntil: 'networkidle' });

  if (pick) {
    const panelFrame = page.frames().find((f) => f.url().endsWith('sidepanel.html'));
    if (!panelFrame) throw new Error('The side panel iframe did not load.');
    await panelFrame.evaluate((result) => globalThis.__deliver({ type: 'PSP_PICKED', result }), DEMO_PICK);
    await panelFrame.getByText('getByRole').first().waitFor();
    // Headings, matched exactly: name matching is substring-and-case-insensitive
    // by default, so "Element" otherwise also hits "Page object  0 elements".
    // scrollIntoView, not scrollIntoViewIfNeeded: a heading peeking in at the
    // bottom edge counts as "needed = no", which silently leaves the shot
    // identical to the previous one.
    if (scroll)
      await panelFrame
        .getByRole('heading', { name: scroll, exact: true })
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
  }

  await page.screenshot({ path: resolve(outdir, file), clip: { x: 0, y: 0, width: w, height: h } });
  console.log(`wrote ${file}  (${w}x${h})`);
}

rmSync(stage, { force: true });
await browser.close();
console.log(`store assets -> ${outdir}`);
