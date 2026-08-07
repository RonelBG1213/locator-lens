/**
 * Guards the vendored engine's API surface.
 *
 * `src/vendor/injectedScript.generated.js` is extracted from playwright-core
 * internals, which carry no semver guarantee. If `npm run vendor` is re-run
 * against a version that renamed or dropped a member, this fails immediately and
 * points at the extractor — rather than the picker silently degrading.
 */
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARNESS_BUNDLE } from './global-setup.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const devDependencies = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  .devDependencies as Record<string, string>;

test('the vendored engine matches the pinned playwright-core version', () => {
  const pinned = devDependencies['playwright-core'];
  const vendored = readFileSync(resolve(root, 'src/vendor/injectedScript.generated.js'), 'utf8');

  // The extractor stamps the version it read into the generated banner.
  expect(vendored).toContain(`export const PLAYWRIGHT_CORE_VERSION = "${pinned}"`);
});

test('the engine and the runner validating it are the same version', () => {
  // `playwright-core` supplies the vendored engine; `@playwright/test` runs the
  // suite that validates it. Bumping one alone is silent — npm nests a second
  // playwright-core under @playwright/test — so the new engine would be checked
  // against the old runner. Upgrade both together: `npm run vendor:upgrade`.
  expect(devDependencies['@playwright/test']).toBe(devDependencies['playwright-core']);
});

test('every engine member the plugin depends on is present', async ({ page }) => {
  await page.goto('/kitchen-sink.html');
  await page.addScriptTag({ path: HARNESS_BUNDLE });

  // Exercising the pipeline is what actually proves the members exist and behave;
  // a shape check alone would pass against a member that had changed signature.
  const analysis = await page.evaluate(() => window.__psp.analyzeSelector('#save-btn'));

  expect(analysis, 'generateSelector + asLocator').not.toBeNull();
  expect(analysis!.best.selector, 'generateSelector').toMatch(/^internal:role=/);
  expect(analysis!.best.locator, 'asLocator').toMatch(/^getByRole\(/);
  expect(analysis!.best.matchCount, 'parseSelector + querySelectorAll').toBe(1);
  expect(analysis!.info.role, 'getAriaRole').toBe('button');
  expect(analysis!.info.accessibleName, 'getElementAccessibleName').toBe('Save changes');
  expect(analysis!.info.visible, 'isElementVisible').toBe(true);
  expect(analysis!.candidates.length, 'generateSelector({ multiple: true })').toBeGreaterThan(1);

  const evaluation = await page.evaluate(() => window.__psp.evaluate('#save-btn'));
  expect(evaluation.previews[0], 'previewNode').toContain('button');
});
