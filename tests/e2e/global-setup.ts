/**
 * Builds the test harness bundle before the e2e run.
 *
 * The harness pulls in the 300KB vendored engine, so it is built once here rather
 * than per-test. `dist/` is built separately by the `test:e2e` script.
 */
import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

export const HARNESS_BUNDLE = resolve(root, 'tests/e2e/harness/bundle.js');

export default async function globalSetup(): Promise<void> {
  if (!existsSync(resolve(root, 'src/vendor/injectedScript.generated.js')))
    throw new Error('Missing vendored engine. Run `npm run vendor` first.');

  await esbuild.build({
    entryPoints: [resolve(here, 'harness/entry.ts')],
    outfile: HARNESS_BUNDLE,
    bundle: true,
    format: 'iife',
    target: 'chrome114',
    logLevel: 'warning',
  });
}
