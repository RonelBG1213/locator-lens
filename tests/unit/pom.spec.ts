import { describe, expect, it } from 'vitest';
import {
  className,
  fileName,
  generatePageObject,
  propertyName,
  withUniqueNames,
} from '../../src/core/pom.js';
import type { SessionEntry } from '../../src/shared/types.js';

function entry(overrides: Partial<SessionEntry> = {}): SessionEntry {
  return {
    name: '',
    locator: "getByRole('button', { name: 'Save' })",
    role: 'button',
    accessibleName: 'Save',
    ...overrides,
  };
}

describe('propertyName', () => {
  it.each([
    [{ accessibleName: 'Save', role: 'button' }, 'saveButton'],
    [{ accessibleName: 'Email address', role: 'textbox' }, 'emailAddressInput'],
    [{ accessibleName: 'Read the docs', role: 'link' }, 'readTheDocsLink'],
    [{ accessibleName: 'Accept terms', role: 'checkbox' }, 'acceptTermsCheckbox'],
    [{ accessibleName: 'Country', role: 'combobox' }, 'countrySelect'],
  ])('names %o as %s', (input, expected) => {
    expect(propertyName(input)).toBe(expected);
  });

  it('does not duplicate a suffix the name already ends with', () => {
    expect(propertyName({ accessibleName: 'Save Button', role: 'button' })).toBe('saveButton');
  });

  it('falls back to the role when there is no accessible name', () => {
    expect(propertyName({ accessibleName: '', role: 'dialog' })).toBe('dialog');
  });

  it('falls back to "element" when there is neither name nor role', () => {
    expect(propertyName({ accessibleName: '', role: null })).toBe('element');
  });

  it('avoids shadowing reserved words and the injected page property', () => {
    expect(propertyName({ accessibleName: 'page', role: null })).toBe('pageLocator');
    expect(propertyName({ accessibleName: 'new', role: null })).toBe('newLocator');
  });

  it('produces a valid identifier from a name starting with a digit', () => {
    expect(propertyName({ accessibleName: '2024 report', role: 'link' })).toBe('n2024ReportLink');
  });

  it('truncates very long accessible names to keep identifiers readable', () => {
    const name = propertyName({
      accessibleName: 'Please confirm that you really want to delete everything',
      role: 'button',
    });
    expect(name).toBe('pleaseConfirmThatYouButton');
  });
});

describe('withUniqueNames', () => {
  it('suffixes duplicates with an incrementing index', () => {
    const named = withUniqueNames([
      entry({ accessibleName: 'Edit' }),
      entry({ accessibleName: 'Edit' }),
      entry({ accessibleName: 'Edit' }),
    ]);
    expect(named.map((e) => e.name)).toEqual(['editButton', 'editButton2', 'editButton3']);
  });
});

describe('className / fileName', () => {
  it.each([
    ['Login', 'LoginPage'],
    ['customer details', 'CustomerDetailsPage'],
    ['checkout.page.ts', 'CheckoutPage'],
    ['OrdersPage', 'OrdersPage'],
    ['', 'UntitledPage'],
  ])('turns %s into %s', (input, expected) => {
    expect(className(input)).toBe(expected);
  });

  it('derives a kebab-case spec-style filename', () => {
    expect(fileName('Customer Details')).toBe('customer-details.page.ts');
    expect(fileName('Login')).toBe('login.page.ts');
  });
});

describe('generatePageObject', () => {
  it('emits readonly locator properties and an injected page, with no assertions', () => {
    const source = generatePageObject('Login', [
      entry({ accessibleName: 'Email address', role: 'textbox', locator: "getByLabel('Email address')" }),
      entry({ accessibleName: 'Sign in', role: 'button', locator: "getByRole('button', { name: 'Sign in' })" }),
    ]);

    expect(source).toMatchInlineSnapshot(`
      "import type { Page } from '@playwright/test';

      export class LoginPage {
        /** textbox: Email address */
        readonly emailAddressInput = this.page.getByLabel('Email address');
        /** button: Sign in */
        readonly signInButton = this.page.getByRole('button', { name: 'Sign in' });

        constructor(private readonly page: Page) {}
      }
      "
    `);
    expect(source).not.toMatch(/expect\(/);
  });

  it('emits a valid empty class when the session has no entries', () => {
    expect(generatePageObject('Empty', [])).toContain('export class EmptyPage {');
  });

  it('preserves a frameLocator prefix on the property', () => {
    const source = generatePageObject('Modal', [
      entry({ locator: "frameLocator('#modal-frame').getByRole('button', { name: 'Save' })" }),
    ]);
    expect(source).toContain("this.page.frameLocator('#modal-frame').getByRole(");
  });

  it('does not let a name containing */ break out of the doc comment', () => {
    const source = generatePageObject('X', [entry({ accessibleName: 'a */ b', role: null })]);
    expect(source).not.toMatch(/\/\*\*.*\*\/.*\*\//);
  });
});
