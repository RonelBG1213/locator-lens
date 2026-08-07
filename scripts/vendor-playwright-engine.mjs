/**
 * Extracts Playwright's injected script bundle into a plain ES module we can ship
 * inside an MV3 extension.
 *
 * Why this exists
 * ---------------
 * `playwright-core` ships its in-page engine as a *string* in
 * `lib/generated/injectedScriptSource.js`, which the Playwright server evaluates
 * in the page (see `lib/server/dom.js`, `_injectedScript()`):
 *
 *     (() => {
 *       const module = {};
 *       <source>
 *       return new (module.exports.InjectedScript())(globalThis, options);
 *     })();
 *
 * MV3 forbids `eval`/`new Function` in extension contexts, so we cannot do that at
 * runtime. Instead we perform the same wrapping at BUILD time and emit real,
 * statically-analysable JavaScript.
 *
 * Version lock
 * ------------
 * This reads a Playwright internal that is not covered by semver. `playwright-core`
 * is pinned exactly in package.json. Versions >= 1.62 removed `lib/generated/` and
 * moved the bundle inside `lib/coreBundle.js`; `readSource()` handles both layouts.
 *
 * Run with: npm run vendor
 */
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const require = createRequire(import.meta.url);

const OUT_FILE = resolve(projectRoot, 'src/vendor/injectedScript.generated.js');
const PARSER_OUT_FILE = resolve(projectRoot, 'src/vendor/locatorParser.generated.js');

/** Resolve the installed playwright-core package root. */
function playwrightCoreRoot() {
  // package.json is always exported, unlike the internal lib/ paths.
  return dirname(require.resolve('playwright-core/package.json'));
}

/**
 * Read the injected-script source string, tolerating both packaging layouts.
 * @returns {{ source: string, layout: string }}
 */
function readSource(root) {
  // Layout A (<= 1.61): a dedicated generated module exporting `source`.
  try {
    const mod = require(resolve(root, 'lib/generated/injectedScriptSource.js'));
    if (typeof mod.source === 'string' && mod.source.length > 0)
      return { source: mod.source, layout: 'lib/generated/injectedScriptSource.js' };
  } catch {
    // fall through
  }

  // Layout B (>= 1.62): folded into the core bundle. The source is still present
  // as a single string literal; find it by its stable leading token.
  const bundlePath = resolve(root, 'lib/coreBundle.js');
  const bundle = readFileSync(bundlePath, 'utf8');
  const marker = 'var injectedScriptSource = ';
  const start = bundle.indexOf(marker);
  if (start === -1)
    throw new Error(
      `Could not locate the injected script source in ${bundlePath}.\n` +
        `The playwright-core layout has changed again — inspect the package and update readSource().`,
    );
  // The literal runs to the end of that statement. Use JSON-ish parsing on the
  // quoted string that follows the marker.
  const literalStart = bundle.indexOf('"', start);
  let i = literalStart + 1;
  for (; i < bundle.length; i++) {
    if (bundle[i] === '\\') { i++; continue; }
    if (bundle[i] === '"') break;
  }
  const source = JSON.parse(bundle.slice(literalStart, i + 1));
  return { source, layout: 'lib/coreBundle.js' };
}

const root = playwrightCoreRoot();
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const { source, layout } = readSource(root);

const banner = `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Playwright's injected selector engine, extracted from playwright-core@${version}
 * (${layout}) by scripts/vendor-playwright-engine.mjs.
 *
 * Regenerate with: npm run vendor
 *
 * Exports createInjectedScript(options) -> InjectedScript instance, mirroring the
 * bootstrap Playwright itself performs in lib/server/dom.js.
 */
/* eslint-disable */
// @ts-nocheck

export const PLAYWRIGHT_CORE_VERSION = ${JSON.stringify(version)};

/**
 * @param {object} options InjectedScript options (testIdAttributeName, sdkLanguage, ...)
 * @returns {object} an InjectedScript instance bound to \`globalThis\`
 */
export function createInjectedScript(options) {
  const module = {};
`;

const footer = `
  return new (module.exports.InjectedScript())(globalThis, options);
}
`;

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, banner + source + footer, 'utf8');

console.log(
  `Vendored playwright-core@${version} injected script ` +
    `(${(source.length / 1024).toFixed(0)} KB from ${layout}) -> src/vendor/injectedScript.generated.js`,
);

/**
 * Selector-text tooling for the live editor:
 *
 *   unsafeLocatorOrSelectorAsSelector — `getByRole('button', { name: 'Save' })`
 *     back into `internal:role=button[name="Save"i]`, so the editor accepts the
 *     same text you paste out of a test. Raw selector syntax passes through.
 *   splitSelectorByFrame / stringifySelector — split a selector at its
 *     `internal:control=enter-frame` boundaries, which is how frameLocator()
 *     hops are encoded. Used to route evaluation into the right frame. Doing
 *     this by string-splitting on ">>" would corrupt quoted text selectors.
 *
 * Unlike the injected script these are ordinary isomorphic CommonJS, so esbuild
 * bundles them directly. Entry paths are absolute to bypass the package's
 * `exports` map, which does not expose `lib/`.
 */
const locatorParserEntry = resolve(root, 'lib/utils/isomorphic/locatorParser.js');
const selectorParserEntry = resolve(root, 'lib/utils/isomorphic/selectorParser.js');

await esbuild.build({
  // A shim entry rather than the files themselves: both are CommonJS, and
  // bundling those to ESM yields only a default export. Re-exporting the named
  // bindings through stdin gives us a clean ESM surface.
  stdin: {
    contents: [
      `export { unsafeLocatorOrSelectorAsSelector } from ${JSON.stringify(locatorParserEntry)};`,
      `export { splitSelectorByFrame, stringifySelector, parseSelector } from ${JSON.stringify(selectorParserEntry)};`,
    ].join('\n'),
    resolveDir: projectRoot,
    loader: 'js',
  },
  outfile: PARSER_OUT_FILE,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome114',
  logLevel: 'warning',
  banner: {
    js:
      `/**\n` +
      ` * GENERATED FILE — DO NOT EDIT BY HAND.\n` +
      ` *\n` +
      ` * Playwright's isomorphic selector-text tooling, bundled from\n` +
      ` * playwright-core@${version} (lib/utils/isomorphic/{locatorParser,selectorParser}.js)\n` +
      ` * by scripts/vendor-playwright-engine.mjs.\n` +
      ` *\n` +
      ` * Regenerate with: npm run vendor\n` +
      ` */\n/* eslint-disable */\n// @ts-nocheck`,
  },
});

console.log(
  `Vendored playwright-core@${version} selector-text tooling -> src/vendor/locatorParser.generated.js`,
);
