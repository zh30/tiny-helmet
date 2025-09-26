import {
  extensionConfig,
  isHostAllowed,
  type ExtensionSettings,
} from '@/shared/config/extension';
import { parseUrl } from '@/shared/lib/utils';
import { loadSettings, saveSettings, subscribeToSettings } from '@/shared/platform/storage';

const SIDE_PANEL_PATH = extensionConfig.sidePanel.assetPath;

let cachedSettings: ExtensionSettings = {
  ...extensionConfig.defaultSettings,
  pinnedHosts: [...extensionConfig.defaultSettings.pinnedHosts],
  sidePanel: { ...extensionConfig.defaultSettings.sidePanel },
};
let hydrating = false;

function copySettings(settings: ExtensionSettings): ExtensionSettings {
  return {
    ...settings,
    pinnedHosts: [...settings.pinnedHosts],
    sidePanel: { ...settings.sidePanel },
  };
}

async function openSidePanel(tabId: number): Promise<boolean> {
  if (typeof chrome === 'undefined' || typeof chrome.sidePanel?.open !== 'function') {
    return false;
  }

  const openFn = chrome.sidePanel.open as (options: chrome.sidePanel.OpenOptions) => Promise<void>;

  try {
    await openFn({ tabId });
    return true;
  } catch (error) {
    console.error('Failed to open side panel', error);
    return false;
  }
}

async function hydrateSettings() {
  if (hydrating) {
    return;
  }

  try {
    hydrating = true;
    cachedSettings = copySettings(await loadSettings());
  } finally {
    hydrating = false;
  }
}

hydrateSettings().catch((error) => {
  console.error('Failed to hydrate settings on startup', error);
});

subscribeToSettings((settings) => {
  cachedSettings = copySettings(settings);
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    const next = copySettings(extensionConfig.defaultSettings);
    await saveSettings(next);
    cachedSettings = next;
  } else {
    await hydrateSettings();
  }
});

async function syncSidePanel(tabId: number, url?: string | null) {
  const parsedUrl = parseUrl(url ?? undefined);
  const hostname = parsedUrl?.hostname?.toLowerCase();

  const shouldEnable = Boolean(
    hostname &&
      (isHostAllowed(hostname) ||
        (cachedSettings.sidePanel.autoOpen && cachedSettings.pinnedHosts.includes(hostname)))
  );

  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: SIDE_PANEL_PATH,
      enabled: shouldEnable,
    });

    if (shouldEnable && cachedSettings.sidePanel.autoOpen) {
      await openSidePanel(tabId);
    }
  } catch (error) {
    console.error('Failed to update side panel options', error);
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') {
    return;
  }

  await hydrateSettings();
  await syncSidePanel(tabId, changeInfo.url ?? tab.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    await hydrateSettings();
    const tab = await chrome.tabs.get(tabId);
    await syncSidePanel(tabId, tab.url);
  } catch (error) {
    console.error('Failed to sync side panel on activation', error);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  await hydrateSettings();
  await syncSidePanel(tab.id, tab.url);
  await openSidePanel(tab.id);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'tiny-helmet:open-side-panel' && sender.tab?.id) {
    const respond = sendResponse as (response?: unknown) => void;

    openSidePanel(sender.tab.id)
      .then((success) => respond({ ok: success }))
      .catch((error) => {
        console.error('Failed to open side panel from message', error);
        respond({ ok: false, error: error?.message });
      });
    return true;
  }

  return undefined;
});
