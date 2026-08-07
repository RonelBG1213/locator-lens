/**
 * Moves the project to a new Playwright version in one step.
 *
 * Why this exists
 * ---------------
 * `playwright-core` supplies the engine we vendor; `@playwright/test` runs the
 * suite that validates it. They must be the same version. Bumping only
 * `playwright-core` does not fail — npm installs a second copy nested under
 * `@playwright/test`, so the new engine gets validated by the old runner and the
 * mismatch is silent. This script installs both, re-vendors, and runs the tests.
 *
 * Run with: npm run vendor:upgrade -- <version|latest>
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Run a command, inheriting stdio. Exits the process on failure. */
function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    // npm is a .cmd shim on Windows and is not directly executable.
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`\nFailed: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
  return capture ? result.stdout.trim() : '';
}

const requested = process.argv[2];
if (!requested) {
  console.error(
    'Usage: npm run vendor:upgrade -- <version|latest>\n' +
      '  e.g. npm run vendor:upgrade -- 1.59.0\n' +
      '       npm run vendor:upgrade -- latest',
  );
  process.exit(1);
}

const version =
  requested === 'latest' ? run('npm', ['view', 'playwright-core', 'version'], { capture: true }) : requested;

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`Not an exact version: ${version}. Pass a full version such as 1.59.0, or 'latest'.`);
  process.exit(1);
}

console.log(`\n== Installing playwright-core@${version} and @playwright/test@${version}`);
run('npm', ['install', '--save-exact', `playwright-core@${version}`, `@playwright/test@${version}`]);

// Browser binaries are versioned alongside the runner; a bump usually needs a new one.
console.log('\n== Installing the matching Chromium build');
run('npx', ['playwright', 'install', 'chromium']);

console.log('\n== Re-vendoring the engine');
run('node', ['scripts/vendor-playwright-engine.mjs']);

console.log('\n== Verifying');
run('npm', ['test']);

console.log(
  `\nPlaywright ${version} is in place and the suite passes.\n` +
    'Review the regenerated files, then commit:\n' +
    '  git add src/vendor/ package.json package-lock.json\n',
);
