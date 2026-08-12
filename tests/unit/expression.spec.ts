/**
 * Assembling a locator expression is the one piece of language handling the panel
 * does itself — everything else is rendered by the engine at pick time. These run
 * in Node: expression.ts is deliberately dependency-free.
 */
import { describe, expect, it } from 'vitest';
import {
  chainExpression,
  frameHopLocators,
  frameLocatorName,
  pageExpression,
  rootName,
} from '../../src/shared/expression.js';
import type { FrameHop } from '../../src/shared/types.js';
import { sources } from './support.js';

const hop = (selector: string): FrameHop => ({
  selector,
  locators: frameHopLocators(selector),
});

describe('frameHopLocators', () => {
  it('spells frameLocator each language’s way', () => {
    expect(frameHopLocators('#modal')).toEqual({
      javascript: 'frameLocator("#modal")',
      python: 'frame_locator("#modal")',
      java: 'frameLocator("#modal")',
      csharp: 'FrameLocator("#modal")',
    });
  });

  it('escapes a selector containing quotes', () => {
    expect(frameHopLocators('iframe[title="a \\ b"]').javascript).toBe(
      'frameLocator("iframe[title=\\"a \\\\ b\\"]")',
    );
  });
});

describe('pageExpression', () => {
  it('hangs the locator off the root receiver, capitalised only for C#', () => {
    expect(pageExpression([], sources(), 'javascript')).toBe(
      "page.getByRole('button', { name: 'Save' })",
    );
    expect(pageExpression([], sources(), 'python')).toBe('page.get_by_role("button", name="Save")');
    expect(pageExpression([], sources(), 'csharp')).toBe(
      'Page.GetByRole(AriaRole.Button, new() { Name = "Save" })',
    );
  });

  it('threads every frame hop in, outermost first', () => {
    expect(pageExpression([hop('#a'), hop('#b')], sources(), 'python')).toBe(
      'page.frame_locator("#a").frame_locator("#b").get_by_role("button", name="Save")',
    );
    expect(pageExpression([hop('#a'), hop('#b')], sources(), 'csharp')).toBe(
      'Page.FrameLocator("#a").FrameLocator("#b").GetByRole(AriaRole.Button, new() { Name = "Save" })',
    );
  });
});

describe('chainExpression', () => {
  it('omits the root, because a page object names its page field itself', () => {
    expect(chainExpression([], sources(), 'python')).toBe('get_by_role("button", name="Save")');
    expect(chainExpression([hop('#modal')], sources(), 'java')).toBe(
      'frameLocator("#modal").getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Save"))',
    );
  });

  it('is exactly pageExpression without its root and dot', () => {
    for (const language of ['javascript', 'python', 'java', 'csharp'] as const) {
      const chain = chainExpression([hop('#modal')], sources(), language);
      expect(pageExpression([hop('#modal')], sources(), language)).toBe(
        `${rootName(language)}.${chain}`,
      );
    }
  });
});

describe('frameLocatorName', () => {
  it('names the method for prose that mentions it', () => {
    expect(frameLocatorName('python')).toBe('frame_locator');
    expect(frameLocatorName('csharp')).toBe('FrameLocator');
  });
});
