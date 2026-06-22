import { type ExtensionSettings, extensionConfig } from '@/shared/config/extension';
import { parseUrl } from '@/shared/lib/utils';
import { loadSettings, saveSettings, subscribeToSettings } from '@/shared/platform/storage';

type BackgroundConfig = typeof extensionConfig;
type RuntimeMessage = {
  type?: string;
  payload?: unknown;
};

function copySettings(settings: ExtensionSettings): ExtensionSettings {
  return {
    ...settings,
    pinnedHosts: [...settings.pinnedHosts],
    sidePanel: { ...settings.sidePanel },
  };
}

function isAllowedHost(hostname: string, config: BackgroundConfig, settings: ExtensionSettings) {
  return (
    config.sidePanel.allowedHosts.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    ) || settings.pinnedHosts.includes(hostname)
  );
}

async function openSidePanel(chromeApi: typeof chrome, tabId: number): Promise<boolean> {
  if (typeof chromeApi.sidePanel?.open !== 'function') {
    return false;
  }

  try {
    await chromeApi.sidePanel.open({ tabId });
    return true;
  } catch (error) {
    console.error('Failed to open side panel', error);
    return false;
  }
}

function addMessageListener(
  chromeApi: typeof chrome,
  type: string,
  handler: (payload: unknown, sender: chrome.runtime.MessageSender) => Promise<unknown> | unknown
) {
  const listener = (
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message?.type !== type) {
      return undefined;
    }

    const result = handler(message.payload, sender);
    if (result instanceof Promise) {
      result.then(sendResponse);
      return true;
    }

    sendResponse(result);
    return undefined;
  };

  chromeApi.runtime.onMessage.addListener(listener);
  return () => chromeApi.runtime.onMessage.removeListener(listener);
}

export function registerBackgroundHandlers(
  chromeApi: typeof chrome,
  config: BackgroundConfig = extensionConfig
) {
  let cachedSettings = copySettings(config.defaultSettings);
  let hydrating = false;

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

  async function syncSidePanel(tabId: number, url?: string | null) {
    const parsedUrl = parseUrl(url ?? undefined);
    const hostname = parsedUrl?.hostname?.toLowerCase();
    const enabled = Boolean(hostname && isAllowedHost(hostname, config, cachedSettings));

    try {
      await chromeApi.sidePanel.setOptions({
        tabId,
        path: config.sidePanel.assetPath,
        enabled,
      });

      if (enabled && cachedSettings.sidePanel.autoOpen) {
        await openSidePanel(chromeApi, tabId);
      }
    } catch (error) {
      console.error('Failed to update side panel options', error);
    }
  }

  hydrateSettings().catch((error) => {
    console.error('Failed to hydrate settings on startup', error);
  });

  const unsubscribeStorage = subscribeToSettings((settings) => {
    cachedSettings = copySettings(settings);
  });

  chromeApi.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') {
      const next = copySettings(config.defaultSettings);
      await saveSettings(next);
      cachedSettings = next;
      return;
    }

    await hydrateSettings();
  });

  chromeApi.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') {
      return;
    }

    await hydrateSettings();
    await syncSidePanel(tabId, changeInfo.url ?? tab.url);
  });

  chromeApi.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
      await hydrateSettings();
      const tab = await chromeApi.tabs.get(tabId);
      await syncSidePanel(tabId, tab.url);
    } catch (error) {
      console.error('Failed to sync side panel on activation', error);
    }
  });

  chromeApi.action.onClicked.addListener(async (tab) => {
    if (!tab.id) {
      return;
    }

    await hydrateSettings();
    await syncSidePanel(tab.id, tab.url);
    await openSidePanel(chromeApi, tab.id);
  });

  const removeOpenSidePanelListener = addMessageListener(
    chromeApi,
    `${config.namespace}:open-side-panel`,
    async (_payload, sender) => {
      if (!sender.tab?.id) {
        return { ok: false, error: 'No tab ID' };
      }

      return { ok: await openSidePanel(chromeApi, sender.tab.id) };
    }
  );

  const removeGetTabInfoListener = addMessageListener(
    chromeApi,
    `${config.namespace}:get-tab-info`,
    (_payload, sender) => ({ url: sender.tab?.url, id: sender.tab?.id })
  );

  return () => {
    unsubscribeStorage();
    removeOpenSidePanelListener();
    removeGetTabInfoListener();
  };
}
