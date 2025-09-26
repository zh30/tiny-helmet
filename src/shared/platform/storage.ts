import {
  extensionConfig,
  SETTINGS_STORAGE_KEY,
  type ExtensionSettings,
} from '@/shared/config/extension';

function cloneSettings(settings: ExtensionSettings): ExtensionSettings {
  return {
    ...settings,
    pinnedHosts: [...settings.pinnedHosts],
    sidePanel: { ...settings.sidePanel },
  };
}

function getStorageArea(): chrome.storage.StorageArea | undefined {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return undefined;
  }

  return chrome.storage.sync ?? chrome.storage.local ?? undefined;
}

function mergeSettings(partial?: Partial<ExtensionSettings>): ExtensionSettings {
  const defaults = extensionConfig.defaultSettings;
  const pinnedHostsSource = partial?.pinnedHosts ?? [...defaults.pinnedHosts];

  return {
    ...defaults,
    ...partial,
    sidePanel: {
      ...defaults.sidePanel,
      ...partial?.sidePanel,
    },
    pinnedHosts: Array.from(new Set(pinnedHostsSource)).map((host) => host.toLowerCase()),
  };
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const storage = getStorageArea();

  if (!storage) {
    return cloneSettings(extensionConfig.defaultSettings);
  }

  return new Promise((resolve) => {
    storage.get([SETTINGS_STORAGE_KEY], (result) => {
      const stored = result?.[SETTINGS_STORAGE_KEY] as ExtensionSettings | undefined;
      resolve(mergeSettings(stored));
    });
  });
}

export async function saveSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const storage = getStorageArea();
  const current = await loadSettings();
  const next = mergeSettings({ ...current, ...partial });

  if (!storage) {
    return next;
  }

  await new Promise<void>((resolve) => {
    storage.set({ [SETTINGS_STORAGE_KEY]: next }, () => resolve());
  });

  return next;
}

export function subscribeToSettings(callback: (settings: ExtensionSettings) => void): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
    return () => undefined;
  }

  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName !== 'sync' && areaName !== 'local') {
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(changes, SETTINGS_STORAGE_KEY)) {
      return;
    }

    const next = changes[SETTINGS_STORAGE_KEY]?.newValue as ExtensionSettings | undefined;
    callback(mergeSettings(next));
  };

  chrome.storage.onChanged.addListener(listener);

  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
