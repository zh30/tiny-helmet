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
const changeListeners: Array<Parameters<typeof subscribeToSettings>[0]> = [];

const chromeMock = {
  storage: {
    sync: {
      get: chromeStorageGet,
      set: chromeStorageSet,
    },
    onChanged: {
      addListener: (
        listener: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void,
      ) => {
        changeListeners.push(listener);
      },
      removeListener: () => undefined,
    },
  },
} satisfies typeof chrome;

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
          pinnedHosts: ['Example.com', 'foo.zhanghe.dev'],
          sidePanel: { autoOpen: false },
        } satisfies ExtensionSettings,
      });
    });

    const settings = await loadSettings();

    expect(settings.sidePanel.autoOpen).toBe(false);
    expect(settings.pinnedHosts).toEqual(['example.com', 'foo.zhanghe.dev']);
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
