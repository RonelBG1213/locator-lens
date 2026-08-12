import { describe, expect, it } from 'vitest';
import {
  className,
  fileName,
  generatePageObject,
  propertyName,
  withUniqueNames,
} from '../../src/core/pom.js';
import type { SessionEntry } from '../../src/shared/types.js';
import { sources, uniform } from './support.js';

function entry(overrides: Partial<SessionEntry> = {}): SessionEntry {
  return {
    name: '',
    locators: sources(),
    role: 'button',
    accessibleName: 'Save',
    ...overrides,
  };
}

/** The two-element Login session every emitter snapshot is taken from. */
const LOGIN: SessionEntry[] = [
  entry({
    accessibleName: 'Email address',
    role: 'textbox',
    locators: {
      javascript: "getByLabel('Email address')",
      python: 'get_by_label("Email address")',
      java: 'getByLabel("Email address")',
      csharp: 'GetByLabel("Email address")',
    },
  }),
  entry({
    accessibleName: 'Sign in',
    role: 'button',
    locators: {
      javascript: "getByRole('button', { name: 'Sign in' })",
      python: 'get_by_role("button", name="Sign in")',
      java: 'getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign in"))',
      csharp: 'GetByRole(AriaRole.Button, new() { Name = "Sign in" })',
    },
  }),
];

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

  it('cases the name the way each language names a member', () => {
    const save = { accessibleName: 'Save changes', role: 'button' };
    expect(propertyName(save, 'javascript')).toBe('saveChangesButton');
    expect(propertyName(save, 'java')).toBe('saveChangesButton');
    expect(propertyName(save, 'python')).toBe('save_changes_button');
    expect(propertyName(save, 'csharp')).toBe('SaveChangesButton');
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

  it('disambiguates in the target language’s casing, not JavaScript’s', () => {
    // `class` is reserved in all four, but the escape hatch must stay idiomatic.
    expect(propertyName({ accessibleName: 'class', role: null }, 'python')).toBe('class_locator');
    expect(propertyName({ accessibleName: 'class', role: null }, 'csharp')).toBe('ClassLocator');
  });

  it('guards words each language reserves but the others do not', () => {
    expect(propertyName({ accessibleName: 'lambda', role: null }, 'python')).toBe('lambda_locator');
    expect(propertyName({ accessibleName: 'lambda', role: null }, 'javascript')).toBe('lambda');
    expect(propertyName({ accessibleName: 'string', role: null }, 'csharp')).toBe('StringLocator');
  });

  it('produces a valid identifier from a name starting with a digit', () => {
    expect(propertyName({ accessibleName: '2024 report', role: 'link' })).toBe('n2024ReportLink');
    expect(propertyName({ accessibleName: '2024 report', role: 'link' }, 'python')).toBe(
      'n2024_report_link',
    );
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

  it('names in the requested language', () => {
    const named = withUniqueNames([entry({ accessibleName: 'Edit' })], 'python');
    expect(named[0]?.name).toBe('edit_button');
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

  it('names the file the way each language expects', () => {
    expect(fileName('Customer Details', 'python')).toBe('customer_details_page.py');
    // Java requires the file to be named for the public class; C# expects it.
    expect(fileName('Customer Details', 'java')).toBe('CustomerDetailsPage.java');
    expect(fileName('Customer Details', 'csharp')).toBe('CustomerDetailsPage.cs');
  });
});

describe('generatePageObject', () => {
  it('emits readonly locator properties and an injected page, with no assertions', () => {
    const source = generatePageObject('Login', LOGIN);

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

  it('emits a Python class assigning locators in __init__', () => {
    expect(generatePageObject('Login', LOGIN, 'python')).toMatchInlineSnapshot(`
      "from playwright.sync_api import Page


      class LoginPage:
          def __init__(self, page: Page) -> None:
              self.page = page
              # textbox: Email address
              self.email_address_input = page.get_by_label("Email address")
              # button: Sign in
              self.sign_in_button = page.get_by_role("button", name="Sign in")
      "
    `);
  });

  it('emits a Java class declaring fields and assigning them in the constructor', () => {
    expect(generatePageObject('Login', LOGIN, 'java')).toMatchInlineSnapshot(`
      "import com.microsoft.playwright.Locator;
      import com.microsoft.playwright.Page;
      import com.microsoft.playwright.options.AriaRole;

      public class LoginPage {
        private final Page page;

        /** textbox: Email address */
        public final Locator emailAddressInput;
        /** button: Sign in */
        public final Locator signInButton;

        public LoginPage(Page page) {
          this.page = page;
          this.emailAddressInput = page.getByLabel("Email address");
          this.signInButton = page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign in"));
        }
      }
      "
    `);
  });

  describe('Java imports', () => {
    /** A pick inside an iframe: Java names the options class after the receiver. */
    const inFrame = entry({
      accessibleName: 'Save',
      locators: sources({
        java:
          'frameLocator("#modal").getByRole(AriaRole.BUTTON, ' +
          'new FrameLocator.GetByRoleOptions().setName("Save"))',
      }),
    });

    it('imports FrameLocator when a locator names it', () => {
      const source = generatePageObject('Modal', [inFrame], 'java');
      expect(source).toContain('import com.microsoft.playwright.FrameLocator;');
      expect(source).toContain('new FrameLocator.GetByRoleOptions()');
    });

    it('does not import FrameLocator when nothing names it', () => {
      expect(generatePageObject('Login', LOGIN, 'java')).not.toContain(
        'import com.microsoft.playwright.FrameLocator;',
      );
    });

    it('imports AriaRole only when a locator names it', () => {
      const byLabel = entry({ locators: sources({ java: 'getByLabel("Email")' }) });
      expect(generatePageObject('X', [byLabel], 'java')).not.toContain('AriaRole');
      expect(generatePageObject('Login', LOGIN, 'java')).toContain(
        'import com.microsoft.playwright.options.AriaRole;',
      );
    });
  });

  it('emits a C# class with expression-bodied locator properties', () => {
    expect(generatePageObject('Login', LOGIN, 'csharp')).toMatchInlineSnapshot(`
      "using Microsoft.Playwright;

      public class LoginPage
      {
          private readonly IPage _page;

          public LoginPage(IPage page)
          {
              _page = page;
          }

          /// <summary>textbox: Email address</summary>
          public ILocator EmailAddressInput => _page.GetByLabel("Email address");
          /// <summary>button: Sign in</summary>
          public ILocator SignInButton => _page.GetByRole(AriaRole.Button, new() { Name = "Sign in" });
      }
      "
    `);
  });

  it.each(['javascript', 'python', 'java', 'csharp'] as const)(
    'emits a valid empty class in %s when the session has no entries',
    (language) => {
      const source = generatePageObject('Empty', [], language);
      expect(source).toContain('EmptyPage');
      // No stray property lines, and nothing that reads as a dangling assignment.
      expect(source).not.toMatch(/=\s*$/m);
    },
  );

  it.each(['javascript', 'python', 'java', 'csharp'] as const)(
    'preserves a frameLocator prefix on the property in %s',
    (language) => {
      const source = generatePageObject(
        'Modal',
        [entry({ locators: uniform('FRAME_HOP.THE_LOCATOR') })],
        language,
      );
      expect(source).toContain('FRAME_HOP.THE_LOCATOR');
    },
  );

  it('does not let a name containing */ break out of the doc comment', () => {
    for (const language of ['javascript', 'java'] as const) {
      const source = generatePageObject(
        'X',
        [entry({ accessibleName: 'a */ b', role: null })],
        language,
      );
      expect(source).not.toMatch(/\/\*\*.*\*\/.*\*\//);
    }
  });

  it('escapes a name that would otherwise malform a C# XML doc comment', () => {
    const source = generatePageObject(
      'X',
      [entry({ accessibleName: 'a </summary> <b>', role: null })],
      'csharp',
    );
    expect(source).toContain('/// <summary>element: a  &lt;b&gt;</summary>');
  });

  it('keeps a newline in an accessible name inside the comment', () => {
    const source = generatePageObject(
      'X',
      [entry({ accessibleName: 'first\nself.injected = 1', role: null })],
      'python',
    );
    expect(source).toContain('        # element: first self.injected = 1\n');
    expect(source).not.toMatch(/^self\.injected/m);
  });
});
