/**
 * Shared fixtures for the unit tests. Not a spec — vitest only collects
 * `*.spec.ts`, so this file is imported, never run on its own.
 */
import type { LocatorSources } from '../../src/shared/types.js';

/**
 * The four renderings of one locator, as Playwright's own `asLocator` produces
 * them. Defaults are the real output for `internal:role=button[name="Save"i]`,
 * copied from the engine rather than invented — tests/e2e/engine.spec.ts is what
 * keeps that claim honest.
 */
export function sources(overrides: Partial<LocatorSources> = {}): LocatorSources {
  return {
    javascript: "getByRole('button', { name: 'Save' })",
    python: 'get_by_role("button", name="Save")',
    java: 'getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Save"))',
    csharp: 'GetByRole(AriaRole.Button, new() { Name = "Save" })',
    ...overrides,
  };
}

/** Same locator in every language — for tests where the rendering is irrelevant. */
export function uniform(locator: string): LocatorSources {
  return { javascript: locator, python: locator, java: locator, csharp: locator };
}
