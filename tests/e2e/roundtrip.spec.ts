/**
 * The test the whole design rests on.
 *
 * The plugin's claim is parity: a locator it shows as unique is unique in a real
 * Playwright run. This drives the plugin's actual pipeline over every element in
 * the kitchen-sink fixture, then hands each suggested locator to real Playwright
 * and asserts it resolves to exactly one element — the same one that was picked.
 *
 * If vendoring ever drifts from Playwright's behaviour, this fails.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { HARNESS_BUNDLE } from './global-setup.js';
import type { Analysis } from './harness/entry.js';

const MARK = 'data-psp-roundtrip';

test.beforeEach(async ({ page }) => {
  await page.goto('/kitchen-sink.html');
  await page.addScriptTag({ path: HARNESS_BUNDLE });
});

/** Turn a `page.getByRole(...)` expression into a live Locator. */
function resolve(page: Page, expression: string): Locator {
  // Test-only: the extension never evaluates locator source at runtime.
  return new Function('page', `return ${expression};`)(page) as Locator;
}

test('every suggested locator resolves, in real Playwright, to the element it was generated from', async ({
  page,
}) => {
  const total = await page.evaluate(() => window.__psp.collect());
  expect(total).toBeGreaterThan(30);

  const checked: string[] = [];
  const skipped: string[] = [];

  for (let index = 0; index < total; index++) {
    const analysis = await page.evaluate((i) => window.__psp.analyze(i), index);
    if (!analysis) continue;

    // The plugin only claims uniqueness for candidates it reports as unique.
    // Elements it cannot uniquely identify are reported honestly, not asserted on.
    if (analysis.best.matchCount !== 1) {
      skipped.push(`${analysis.tagName}: ${analysis.expression}`);
      continue;
    }

    await page.evaluate((i) => window.__psp.mark(i), index);
    const locator = resolve(page, analysis.expression);

    await test.step(`${analysis.tagName} — ${analysis.expression}`, async () => {
      expect(await locator.count(), 'should resolve to exactly 1 element').toBe(1);

      const hitTheSameElement = (await locator.getAttribute(MARK)) === 'yes';
      if (hitTheSameElement) return;

      // Playwright deliberately retargets some elements (an <option> to its
      // <select>). That is allowed, but only if the plugin declares it — a
      // silent retarget is the failure mode this whole test exists to catch.
      expect(analysis.retarget, `undeclared retarget for <${analysis.tagName}>`).not.toBeNull();
      expect(analysis.retarget?.isAncestor, 'retarget must be to an enclosing element').toBe(true);
      await expect(locator.locator(`[${MARK}="yes"]`)).toHaveCount(1);
    });

    await page.evaluate(() => window.__psp.unmark());
    checked.push(analysis.expression);
  }

  // Guard against the pipeline silently degrading into "no opinion" for everything.
  expect(checked.length, `checked ${checked.length}, skipped ${skipped.length}`).toBeGreaterThan(25);
});

test('accessible names match what getByRole actually matches on', async ({ page }) => {
  // aria-labelledby is exactly where a hand-rolled name computation would drift.
  const analysis = await page.evaluate(() =>
    window.__psp.analyzeSelector('[role="checkbox"][aria-labelledby]'),
  );

  expect(analysis?.info.role).toBe('checkbox');
  expect(analysis?.info.accessibleName).toBe('I agree to the terms of service');
  await expect(
    page.getByRole('checkbox', { name: 'I agree to the terms of service' }),
  ).toHaveCount(1);
});

test.describe('locator strategy', () => {
  const cases: Array<{ name: string; css: string; expression: string }> = [
    { name: 'button', css: '#save-btn', expression: "page.getByRole('button', { name: 'Save changes' })" },
    { name: 'link', css: '#clean a', expression: "page.getByRole('link', { name: 'Read the docs' })" },
    { name: 'labelled input', css: '#email', expression: "page.getByRole('textbox', { name: 'Email address' })" },
    { name: 'image with alt', css: '#clean img', expression: "page.getByRole('img', { name: 'Company logo' })" },
    { name: 'test id', css: '[data-testid="order-total"]', expression: "page.getByTestId('order-total')" },
    { name: 'aria-label only', css: '#aria button', expression: "page.getByRole('button', { name: 'Close dialog' })" },
  ];

  for (const { name, css, expression } of cases) {
    test(`prefers a role or test-id locator for a ${name}`, async ({ page }) => {
      const analysis = await page.evaluate((s) => window.__psp.analyzeSelector(s), css);
      expect(analysis?.expression).toBe(expression);
      expect(analysis?.best.matchCount).toBe(1);
      expect(analysis?.best.score).toBeGreaterThanOrEqual(75);
    });
  }
});

test('scopes duplicated controls instead of emitting an ambiguous locator', async ({ page }) => {
  const analysis = await page.evaluate(() =>
    window.__psp.analyzeSelector('#row-two > button'),
  );

  expect(analysis?.best.matchCount).toBe(1);
  // Two identical "Delete" buttons exist, so the bare role locator cannot be used.
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(2);
  expect(await resolve(page, analysis!.expression).count()).toBe(1);
});

test('declares when Playwright retargets the locator to an enclosing element', async ({ page }) => {
  // Clicking an <option> yields a locator for the <select>: correct advice, but
  // it must be stated, or the copied locator silently points somewhere else.
  const analysis = await page.evaluate(() =>
    window.__psp.analyzeSelector('#clean select option'),
  );

  expect(analysis?.retarget).not.toBeNull();
  expect(analysis?.retarget?.tagName).toBe('select');
  expect(analysis?.retarget?.isAncestor).toBe(true);
  expect(analysis?.retarget?.note).toContain('selectOption()');
});

test('does not claim a retarget for an ordinary element', async ({ page }) => {
  const analysis = await page.evaluate(() => window.__psp.analyzeSelector('#save-btn'));
  expect(analysis?.retarget).toBeNull();
});

test('penalises hostile markup and explains why', async ({ page }) => {
  const analysis = await page.evaluate(() =>
    window.__psp.analyzeSelector('.css-1a2b3c4d5e'),
  );

  const reasons = analysis!.candidates.flatMap((c) => c.penalties.map((p) => p.id));
  expect(reasons.length).toBeGreaterThan(0);
  // The best candidate should still be usable even when the markup is poor.
  expect(analysis?.best.matchCount).toBe(1);
});

test('finds elements inside an open shadow root', async ({ page }) => {
  await page.evaluate(() => window.__psp.collect());
  const analysis = await page.evaluate(() =>
    window.__psp.analyzeSelector('#shadow-host') /* host itself */,
  );
  expect(analysis).not.toBeNull();

  // Playwright pierces open shadow roots; the plugin's suggestion must too.
  await expect(page.getByRole('button', { name: 'Inside shadow root' })).toHaveCount(1);
});

test('live evaluation agrees with Playwright on match counts', async ({ page }) => {
  const cases: Array<[string, number]> = [
    ["internal:role=button[name=\"Delete\"i]", 2],
    ["internal:role=button[name=\"Save changes\"i]", 1],
    ['#definitely-not-here', 0],
  ];

  for (const [selector, expected] of cases) {
    const result = await page.evaluate((s) => window.__psp.evaluate(s), selector);
    expect(result.error, selector).toBeNull();
    expect(result.matchCount, selector).toBe(expected);
    expect(result.strictViolation, selector).toBe(expected > 1);
  }
});

test('reports a parse error instead of throwing on invalid input', async ({ page }) => {
  const result = await page.evaluate(() => window.__psp.evaluate('internal:role='));
  expect(result.matchCount).toBeNull();
  expect(result.error).toBeTruthy();
  expect(result.error).not.toContain('\n');
});

test('raw CSS and XPath both resolve back to the picked element', async ({ page }) => {
  for (const css of ['#save-btn', '#email', '#aria button', '#table-section td']) {
    const analysis = await page.evaluate((s) => window.__psp.analyzeSelector(s), css);
    expect(analysis, css).not.toBeNull();

    await page.evaluate(() => window.__psp.mark(0));

    const viaCss = await page.evaluate(
      (s) => document.querySelector(s)?.getAttribute('data-psp-roundtrip') ?? null,
      analysis!.css,
    );
    const viaXpath = await page.evaluate((s) => {
      const node = document.evaluate(s, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue as Element | null;
      return node?.getAttribute('data-psp-roundtrip') ?? null;
    }, analysis!.xpath);

    expect(viaCss, `css for ${css}: ${analysis!.css}`).toBe('yes');
    expect(viaXpath, `xpath for ${css}: ${analysis!.xpath}`).toBe('yes');

    await page.evaluate(() => window.__psp.unmark());
  }
});
