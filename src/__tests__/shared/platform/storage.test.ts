import { describe, expect, it, vi } from 'vitest';
import {
  extensionConfig,
  type ExtensionSettings,
  SETTINGS_STORAGE_KEY,
} from '@/shared/config/extension';
import {
  loadSettings,
  saveSettings,
  subscribeToSettings,
} from '@/shared/platform/storage';

const chromeStorageGet = vi.fn();
const chromeStorageSet = vi.fn();
const changeListeners: Array<
  (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
> = [];

const chromeMock = {
  storage: {
    sync: {
      get: chromeStorageGet,
      set: chromeStorageSet,
      remove: vi.fn(),
      clear: vi.fn(),
      getBytesInUse: vi.fn(),
      getKeys: vi.fn(),
    },
    onChanged: {
      addListener: (
        listener: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void,
      ) => {
        changeListeners.push(listener);
      },
      removeListener: (
        listener: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void,
      ) => {
        const index = changeListeners.indexOf(listener);
        if (index !== -1) {
          changeListeners.splice(index, 1);
        }
      },
      hasListener: (
        listener: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void,
      ) => changeListeners.includes(listener),
      hasListeners: () => changeListeners.length > 0,
    },
  },
} as unknown as typeof chrome;

vi.stubGlobal('chrome', chromeMock);

function emitStorageChange(change: Partial<ExtensionSettings>) {
  changeListeners.forEach((listener) =>
    listener(
      {
        [SETTINGS_STORAGE_KEY]: {
          newValue: change,
        },
      },
      'sync',
    ),
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
      expect.any(Function),
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

    emitStorageChange({ ...extensionConfig.defaultSettings, theme: 'dark' });

    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});
