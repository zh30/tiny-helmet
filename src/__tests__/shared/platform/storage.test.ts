import { describe, expect, it, vi } from 'vitest';
import {
  type ExtensionSettings,
  extensionConfig,
  SETTINGS_STORAGE_KEY,
} from '@/shared/config/extension';
import {
  getStorageItem,
  loadSettings,
  removeStorageItem,
  saveSettings,
  setStorageItem,
  subscribeToSettings,
  subscribeToStorageKey,
} from '@/shared/platform/storage';

const chromeStorageGet = vi.fn();
const chromeStorageSet = vi.fn();
const chromeStorageRemove = vi.fn();
const changeListeners: Array<
  (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
> = [];

const chromeMock = {
  storage: {
    sync: {
      get: chromeStorageGet,
      set: chromeStorageSet,
      remove: chromeStorageRemove,
      clear: vi.fn(),
      getBytesInUse: vi.fn(),
      getKeys: vi.fn(),
    },
    onChanged: {
      addListener: (
        listener: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
      ) => {
        changeListeners.push(listener);
      },
      removeListener: (
        listener: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
      ) => {
        const index = changeListeners.indexOf(listener);
        if (index !== -1) {
          changeListeners.splice(index, 1);
        }
      },
      hasListener: (
        listener: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
      ) => changeListeners.includes(listener),
      hasListeners: () => changeListeners.length > 0,
    },
  },
} as unknown as typeof chrome;

vi.stubGlobal('chrome', chromeMock);

function emitStorageChange(key: string, newValue: unknown) {
  changeListeners.forEach((listener) =>
    listener(
      {
        [key]: {
          newValue,
        },
      },
      'sync'
    )
  );
}

describe('storage helpers', () => {
  it('loads default settings when storage returns nothing', async () => {
    chromeStorageGet.mockImplementation((_keys, callback) => {
      callback({});
    });

    const settings = await loadSettings();

    expect(settings).toEqual(extensionConfig.defaultSettings);
  });

  it('merges settings from storage and lowercases pinned hosts', async () => {
    chromeStorageGet.mockImplementation((_keys, callback) => {
      callback({
        [SETTINGS_STORAGE_KEY]: {
          ...extensionConfig.defaultSettings,
          pinnedHosts: ['Example.com', 'foo.zh30.github.io'],
          sidePanel: { autoOpen: false },
        } satisfies ExtensionSettings,
      });
    });

    const settings = await loadSettings();

    expect(settings.sidePanel.autoOpen).toBe(false);
    expect(settings.pinnedHosts).toEqual(['example.com', 'foo.zh30.github.io']);
  });

  it('saves merged settings back to storage', async () => {
    chromeStorageGet.mockImplementation((_keys, callback) => {
      callback({
        [SETTINGS_STORAGE_KEY]: extensionConfig.defaultSettings,
      });
    });

    chromeStorageSet.mockImplementation((_value, callback) => {
      callback();
    });

    const result = await saveSettings({ theme: 'dark' });

    expect(result.theme).toBe('dark');
    expect(chromeStorageSet).toHaveBeenCalledWith(
      {
        [SETTINGS_STORAGE_KEY]: result,
      },
      expect.any(Function)
    );
  });

  it('invokes listeners when storage changes occur', async () => {
    chromeStorageGet.mockImplementation((_keys, callback) => {
      callback({
        [SETTINGS_STORAGE_KEY]: extensionConfig.defaultSettings,
      });
    });

    chromeStorageSet.mockImplementation((_value, callback) => {
      callback();
    });

    const listener = vi.fn();
    const unsubscribe = subscribeToSettings(listener);

    emitStorageChange(SETTINGS_STORAGE_KEY, { ...extensionConfig.defaultSettings, theme: 'dark' });

    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it('supports generic getStorageItem, setStorageItem, removeStorageItem, and subscribeToStorageKey', async () => {
    chromeStorageGet.mockImplementation((_keys, callback) => {
      callback({ customKey: { count: 42 } });
    });
    chromeStorageSet.mockImplementation((_value, callback) => {
      callback();
    });
    chromeStorageRemove.mockImplementation((_keys, callback) => {
      callback();
    });

    const val = await getStorageItem('customKey', { count: 0 });
    expect(val).toEqual({ count: 42 });

    await setStorageItem('customKey', { count: 43 });
    expect(chromeStorageSet).toHaveBeenCalledWith(
      { customKey: { count: 43 } },
      expect.any(Function)
    );

    await removeStorageItem('customKey');
    expect(chromeStorageRemove).toHaveBeenCalledWith(['customKey'], expect.any(Function));

    const keyListener = vi.fn();
    const unsubKey = subscribeToStorageKey('customKey', keyListener);
    emitStorageChange('customKey', { count: 100 });
    expect(keyListener).toHaveBeenCalledWith({ count: 100 }, undefined);
    unsubKey();
  });
});
