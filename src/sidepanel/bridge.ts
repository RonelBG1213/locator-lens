/**
 * The panel's side of the messaging contract.
 *
 * Every call targets frameId 0 explicitly. Without it Chrome fans the message out
 * to all frames and resolves with whichever replies first, which for a page with
 * iframes is a coin toss.
 */
import type { ContentResponses, PanelToContent } from '../shared/messages.js';
import { DEFAULT_SETTINGS, type Settings } from '../shared/types.js';

export async function activeTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

/** Send to the top frame. Resolves to null when no content script answers. */
export async function send<T extends PanelToContent['type']>(
  tabId: number,
  message: Extract<PanelToContent, { type: T }>,
): Promise<ContentResponses[T] | null> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message, { frameId: 0 })) ?? null;
  } catch {
    // No receiver: the script is not injected, or the page forbids injection.
    return null;
  }
}

/** Ask the service worker to (re)inject after a navigation wiped the script. */
export async function ensureInjected(tabId: number): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'PSP_ENSURE_INJECTED', tabId });
  } catch {
    // Worker asleep or restarting; the next PING will report the failure.
  }
}

/**
 * Whether the user has granted the optional all-sites permission.
 *
 * Without it the picker relies on `activeTab`, which Chrome revokes on
 * cross-origin navigation — so the panel goes dead until the toolbar icon is
 * clicked again. With it, the picker survives navigation for a whole session.
 */
export async function hasPersistentAccess(): Promise<boolean> {
  return chrome.permissions.contains({ origins: ['<all_urls>'] });
}

/** Must be called directly from a click handler; Chrome requires a user gesture. */
export async function requestPersistentAccess(): Promise<boolean> {
  return chrome.permissions.request({ origins: ['<all_urls>'] });
}

export async function revokePersistentAccess(): Promise<boolean> {
  return chrome.permissions.remove({ origins: ['<all_urls>'] });
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set(settings);
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** PNG to the clipboard. Rejects if the panel does not have focus. */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

/**
 * Photograph the visible viewport of the tab's window.
 *
 * Needs no permission the extension does not already hold: `activeTab` covers
 * captureVisibleTab for the tab the user invoked us on. Null when Chrome refuses
 * — an activeTab grant lapses on cross-origin navigation, and restricted pages
 * are never capturable.
 */
export async function captureVisibleTab(tabId: number): Promise<string | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  } catch {
    return null;
  }
}

/** Offer generated source as a download without needing the downloads permission. */
export function downloadText(fileName: string, text: string): void {
  download(fileName, new Blob([text], { type: 'text/plain' }));
}

export function downloadBlob(fileName: string, blob: Blob): void {
  download(fileName, blob);
}

function download(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
