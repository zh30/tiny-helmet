import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const globalWithChrome = globalThis as typeof globalThis & {
  chrome?: typeof chrome;
};

type StorageChangeListener = Parameters<
  NonNullable<typeof chrome.storage.onChanged['addListener']>
>[0];

const storageChangeListeners = new Set<StorageChangeListener>();

const mockStorageChangeEmitter = {
  addListener(listener: StorageChangeListener) {
    storageChangeListeners.add(listener);
  },
  removeListener(listener: StorageChangeListener) {
    storageChangeListeners.delete(listener);
  },
  hasListener(listener: StorageChangeListener) {
    return storageChangeListeners.has(listener);
  },
  hasListeners() {
    return storageChangeListeners.size > 0;
  },
  addRules: vi.fn(),
  removeRules: vi.fn(),
  getRules: vi.fn((_: unknown, callback?: (rules: chrome.events.Rule[]) => void) => {
    callback?.([]);
  }),
};

function createStorageArea(): chrome.storage.StorageArea {
  const getImpl = ((
    _keys?: string | string[] | Record<string, unknown> | null,
    callback?: (items: Record<string, unknown>) => void,
  ) => {
    if (typeof callback === 'function') {
      callback({});
      return;
    }
    return Promise.resolve({} as Record<string, unknown>);
  }) as chrome.storage.StorageArea['get'];

  const getKeysImpl = ((callback?: (keys: string[]) => void) => {
    if (typeof callback === 'function') {
      callback([]);
      return;
    }
    return Promise.resolve([] as string[]);
  }) as chrome.storage.StorageArea['getKeys'];

  const getBytesImpl = ((
    _keys?: string | string[],
    callback?: (bytesInUse: number) => void,
  ) => {
    if (typeof callback === 'function') {
      callback(0);
      return;
    }
    return Promise.resolve(0);
  }) as chrome.storage.StorageArea['getBytesInUse'];

  const setImpl = ((items: Record<string, unknown>, callback?: () => void) => {
    if (typeof callback === 'function') {
      callback();
      return;
    }
    return Promise.resolve();
  }) as chrome.storage.StorageArea['set'];

  const removeImpl = ((keys: string | string[], callback?: () => void) => {
    if (typeof callback === 'function') {
      callback();
      return;
    }
    return Promise.resolve();
  }) as chrome.storage.StorageArea['remove'];

  const clearImpl = ((callback?: () => void) => {
    if (typeof callback === 'function') {
      callback();
      return;
    }
    return Promise.resolve();
  }) as chrome.storage.StorageArea['clear'];

  const setAccessLevelImpl = ((
    _options: {accessLevel: chrome.storage.AccessLevel},
    callback?: () => void,
  ) => {
    if (typeof callback === 'function') {
      callback();
      return;
    }
    return Promise.resolve();
  }) as chrome.storage.StorageArea['setAccessLevel'];

  return {
    onChanged: mockStorageChangeEmitter as unknown as chrome.storage.StorageArea['onChanged'],
    get: getImpl,
    getKeys: getKeysImpl,
    getBytesInUse: getBytesImpl,
    set: setImpl,
    remove: removeImpl,
    clear: clearImpl,
    setAccessLevel: setAccessLevelImpl,
  };
}

if (!globalWithChrome.chrome) {
  globalWithChrome.chrome = {
    runtime: {
      connect: () => ({ onDisconnect: { addListener: () => undefined } }),
      sendMessage: () => Promise.resolve(undefined),
      lastError: undefined,
    },
    sidePanel: undefined,
    storage: {
      local: createStorageArea(),
      sync: createStorageArea(),
      onChanged: mockStorageChangeEmitter as unknown as typeof chrome.storage.onChanged,
    },
    i18n: {
      getMessage: (key: string) => key,
    },
  } as unknown as typeof chrome;
}

type StorageAreaName = 'sync' | 'local' | 'managed';

export const emitChromeStorageChange = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: StorageAreaName,
) => {
  storageChangeListeners.forEach((listener) => listener(changes, areaName));
};
