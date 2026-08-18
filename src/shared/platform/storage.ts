import {
  type ExtensionSettings,
  extensionConfig,
  SETTINGS_STORAGE_KEY,
} from '@/shared/config/extension';

export type StorageAreaName = 'sync' | 'local' | 'session' | 'managed';

const memoryStore = new Map<string, unknown>();

function getLastError(): { message?: string } | undefined {
  return (chrome.runtime as unknown as { lastError?: { message?: string } })?.lastError;
}

function getStorageArea(area: StorageAreaName = 'sync'): chrome.storage.StorageArea | undefined {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return undefined;
  }

  if (area === 'session' && chrome.storage.session) {
    return chrome.storage.session;
  }
  if (area === 'managed' && chrome.storage.managed) {
    return chrome.storage.managed;
  }
  if (area === 'local' && chrome.storage.local) {
    return chrome.storage.local;
  }

  return chrome.storage.sync ?? chrome.storage.local ?? undefined;
}

export async function getStorageItem<T>(
  key: string,
  defaultValue: T,
  area: StorageAreaName = 'sync'
): Promise<T> {
  const storage = getStorageArea(area);
  if (!storage) {
    if (memoryStore.has(`${area}:${key}`)) {
      return memoryStore.get(`${area}:${key}`) as T;
    }
    return defaultValue;
  }

  return new Promise((resolve) => {
    storage.get([key], (result) => {
      const stored = result?.[key];
      if (stored === undefined || stored === null) {
        resolve(defaultValue);
      } else {
        resolve(stored as T);
      }
    });
  });
}

export async function setStorageItem<T>(
  key: string,
  value: T,
  area: StorageAreaName = 'sync'
): Promise<void> {
  const storage = getStorageArea(area);
  if (!storage) {
    memoryStore.set(`${area}:${key}`, value);
    return;
  }

  return new Promise((resolve, reject) => {
    storage.set({ [key]: value }, () => {
      const lastError = getLastError();
      if (lastError) {
        reject(new Error(lastError.message || `Failed to set storage key "${key}"`));
      } else {
        resolve();
      }
    });
  });
}

export async function removeStorageItem(
  key: string | string[],
  area: StorageAreaName = 'sync'
): Promise<void> {
  const storage = getStorageArea(area);
  const keys = Array.isArray(key) ? key : [key];

  if (!storage) {
    keys.forEach((k) => memoryStore.delete(`${area}:${k}`));
    return;
  }

  return new Promise((resolve, reject) => {
    storage.remove(keys, () => {
      const lastError = getLastError();
      if (lastError) {
        reject(new Error(lastError.message || `Failed to remove storage keys`));
      } else {
        resolve();
      }
    });
  });
}

export function subscribeToStorageKey<T>(
  key: string,
  callback: (newValue: T | undefined, oldValue: T | undefined) => void,
  area: StorageAreaName = 'sync'
): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) {
    return () => undefined;
  }

  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== area && !(area === 'sync' && areaName === 'local')) {
      return;
    }

    if (Object.hasOwn(changes, key)) {
      const change = changes[key];
      callback(change.newValue as T | undefined, change.oldValue as T | undefined);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
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
  const stored = await getStorageItem<ExtensionSettings | undefined>(
    SETTINGS_STORAGE_KEY,
    undefined,
    'sync'
  );
  return mergeSettings(stored ?? undefined);
}

export async function saveSettings(
  partial: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const next = mergeSettings({ ...current, ...partial });
  await setStorageItem(SETTINGS_STORAGE_KEY, next, 'sync');
  return next;
}

export function subscribeToSettings(callback: (settings: ExtensionSettings) => void): () => void {
  return subscribeToStorageKey<ExtensionSettings>(
    SETTINGS_STORAGE_KEY,
    (newValue) => {
      callback(mergeSettings(newValue ?? undefined));
    },
    'sync'
  );
}
