/**
 * Owns the single InjectedScript instance for this frame.
 *
 * The engine caches ARIA computations internally, so we keep one instance alive
 * rather than rebuilding it per pick. It is rebuilt only when the test-id
 * attribute changes, since that is baked in at construction time.
 */
import {
  createInjectedScript,
  PLAYWRIGHT_CORE_VERSION,
  type InjectedScript,
} from '../vendor/injectedScript.generated.js';
import { DEFAULT_SETTINGS } from '../shared/types.js';

let instance: InjectedScript | null = null;
let currentTestId = DEFAULT_SETTINGS.testIdAttributeName;

/** The InjectedScript for this frame, created on first use. */
export function engine(): InjectedScript {
  if (!instance) {
    instance = createInjectedScript({
      isUnderTest: false,
      sdkLanguage: 'javascript',
      testIdAttributeName: currentTestId,
      stableRafCount: 1,
      browserName: 'chromium',
      isUtilityWorld: false,
      customEngines: [],
    });
  }
  return instance;
}

/**
 * Point the engine at a different test-id attribute. Discards the instance so
 * the next `engine()` call picks the new value up.
 */
export function setTestIdAttribute(name: string): void {
  if (name === currentTestId) return;
  currentTestId = name;
  instance = null;
}

export function testIdAttribute(): string {
  return currentTestId;
}

export { PLAYWRIGHT_CORE_VERSION };
