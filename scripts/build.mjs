/**
 * Builds the unpacked MV3 extension into dist/.
 *
 * esbuild rather than Vite+CRXJS: MV3 content scripts cannot be ES modules, the
 * side panel is a single small page, and we want the build to be boring and
 * dependency-light. `--watch` rebuilds on change; reload the extension in
 * chrome://extensions to pick changes up.
 */
import * as esbuild from 'esbuild';
import { rmSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(root, 'dist');
const watch = process.argv.includes('--watch');

if (!existsSync(resolve(root, 'src/vendor/injectedScript.generated.js')))
  throw new Error('Missing vendored engine. Run `npm run vendor` first.');

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

/** @type {chrome.runtime.ManifestV3} */
const manifest = {
  manifest_version: 3,
  name: 'Locator Lens',
  version: '0.1.0',
  // "Playwright" stays out of the name and appears only descriptively here: it is
  // what the tool works with, not who made it. The disclaimer is deliberate — the
  // extension bundles playwright-core, so the affiliation question is a fair one
  // to answer up front rather than in a review reply.
  description:
    'Click any element to get a ranked, verified locator for your Playwright tests. Unofficial; not affiliated with Microsoft.',
  homepage_url: 'https://github.com/RonelBG1213/locator-lens',
  minimum_chrome_version: '114',
  // activeTab keeps the install prompt free of "read your data on all websites".
  // It is granted per toolbar click and revoked on cross-origin navigation, so the
  // panel offers <all_urls> as an OPTIONAL upgrade for users who want the picker to
  // survive navigation during a session. Nothing is requested until they ask.
  permissions: ['activeTab', 'scripting', 'sidePanel', 'storage'],
  optional_host_permissions: ['<all_urls>'],
  action: { default_title: 'Locator Lens' },
  background: { service_worker: 'background.js', type: 'module' },
  side_panel: { default_path: 'sidepanel.html' },
  commands: {
    'toggle-pick': {
      suggested_key: { default: 'Alt+Shift+P' },
      description: 'Toggle element pick mode',
    },
  },
};

writeFileSync(resolve(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
copyFileSync(resolve(root, 'src/sidepanel/index.html'), resolve(outdir, 'sidepanel.html'));

// Apache-2.0 obliges us to ship the licence with the binary, and `content.js`
// carries the vendored engine. It has to travel in the package, not just sit in
// the repo — and it cannot ride along inside the bundle, since esbuild is set to
// legalComments: 'none' below.
copyFileSync(resolve(root, 'THIRD_PARTY_NOTICES.txt'), resolve(outdir, 'THIRD_PARTY_NOTICES.txt'));

const common = {
  bundle: true,
  target: 'chrome114',
  logLevel: 'info',
  legalComments: 'none',
  sourcemap: watch ? 'inline' : false,
  minify: !watch,
};

const builds = [
  // Content script: IIFE, never a module. Carries the vendored engine.
  {
    ...common,
    entryPoints: [resolve(root, 'src/content/index.ts')],
    outfile: resolve(outdir, 'content.js'),
    format: 'iife',
  },
  // Service worker: declared as type: module in the manifest.
  {
    ...common,
    entryPoints: [resolve(root, 'src/background/index.ts')],
    outfile: resolve(outdir, 'background.js'),
    format: 'esm',
  },
  // Side panel UI.
  {
    ...common,
    entryPoints: [resolve(root, 'src/sidepanel/main.tsx')],
    outfile: resolve(outdir, 'sidepanel.js'),
    format: 'iife',
    jsx: 'automatic',
    jsxImportSource: 'preact',
    loader: { '.css': 'text' },
  },
];

if (watch) {
  const contexts = await Promise.all(builds.map((b) => esbuild.context(b)));
  await Promise.all(contexts.map((c) => c.watch()));
  console.log('watching… (reload the extension in chrome://extensions after a rebuild)');
} else {
  await Promise.all(builds.map((b) => esbuild.build(b)));
  console.log(`built -> ${outdir}`);
}
