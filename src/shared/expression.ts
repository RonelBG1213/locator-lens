/**
 * Renders a pick as the JavaScript expression you paste into a test.
 *
 * Pure and dependency-free so both the content script and the side panel can use
 * it — the panel must never pull in the 300KB engine bundle.
 */
import type { FrameHop } from './types.js';

/** e.g. `page.frameLocator('#modal').getByRole('button', { name: 'Save' })` */
export function pageExpression(frameChain: FrameHop[], locator: string): string {
  return ['page', ...frameChain.map((hop) => hop.locator), locator].join('.');
}
