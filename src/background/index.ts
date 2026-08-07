/**
 * Service worker. Deliberately thin: it opens the side panel, injects the content
 * script, and stays out of the message path — the panel talks to the top frame
 * directly via chrome.tabs.sendMessage.
 *
 * The extension holds no host permissions. `activeTab` grants access to a tab
 * only after the user clicks the action (or presses the command shortcut), which
 * keeps the install prompt free of "read your data on all websites".
 */

chrome.runtime.onInstalled.addListener(() => {
  // Opening on action click is handled explicitly below so we can inject first.
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return;
  // Must be called in the same task as the user gesture, before any await.
  const opening = chrome.sidePanel.open({ tabId: tab.id });
  await inject(tab.id);
  await opening;
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'toggle-pick' || tab?.id === undefined) return;
  await inject(tab.id);
  await chrome.tabs.sendMessage(tab.id, { type: 'PSP_SET_MODE', mode: 'pick' }).catch(() => {});
});

/**
 * Inject into every frame. Re-injection is safe and expected — the content
 * script's `__pspLoaded` guard makes a second run a no-op.
 */
async function inject(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['content.js'],
    });
  } catch (error) {
    // Restricted pages (chrome://, the Web Store, PDF viewer) reject injection.
    // The panel surfaces this as "not available on this page" when PING fails.
    console.warn('[psp] injection failed:', error);
  }
}

/** Let the side panel ask for a (re)injection after a navigation. */
chrome.runtime.onMessage.addListener((message: { type?: string; tabId?: number }, _s, respond) => {
  if (message?.type !== 'PSP_ENSURE_INJECTED' || message.tabId === undefined) return false;
  inject(message.tabId).then(() => respond({ ok: true }));
  return true; // async response
});
