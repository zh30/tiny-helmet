import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const globalWithChrome = globalThis as typeof globalThis & {
  chrome?: typeof chrome;
};

type StorageChangeListener = Parameters<
  NonNullable<(typeof chrome.storage.onChanged)['addListener']>
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
  const store = new Map<string, unknown>();

  const getImpl = ((
    keys?: string | string[] | Record<string, unknown> | null,
    callback?: (items: Record<string, unknown>) => void
  ) => {
    const result: Record<string, unknown> = {};
    if (typeof keys === 'string') {
      if (store.has(keys)) result[keys] = store.get(keys);
    } else if (Array.isArray(keys)) {
      keys.forEach((k) => {
        if (store.has(k)) result[k] = store.get(k);
      });
    } else if (keys && typeof keys === 'object') {
      Object.keys(keys).forEach((k) => {
        result[k] = store.has(k) ? store.get(k) : keys[k];
      });
    } else {
      store.forEach((v, k) => {
        result[k] = v;
      });
    }

    if (typeof callback === 'function') {
      callback(result);
      return;
    }
    return Promise.resolve(result);
  }) as chrome.storage.StorageArea['get'];

  const getKeysImpl = ((callback?: (keys: string[]) => void) => {
    const keys = Array.from(store.keys());
    if (typeof callback === 'function') {
      callback(keys);
      return;
    }
    return Promise.resolve(keys);
  }) as chrome.storage.StorageArea['getKeys'];

  const getBytesImpl = ((_keys?: string | string[], callback?: (bytesInUse: number) => void) => {
    if (typeof callback === 'function') {
      callback(0);
      return;
    }
    return Promise.resolve(0);
  }) as chrome.storage.StorageArea['getBytesInUse'];

  const setImpl = ((items: Record<string, unknown>, callback?: () => void) => {
    Object.entries(items).forEach(([k, v]) => {
      store.set(k, v);
    });
    if (typeof callback === 'function') {
      callback();
      return;
    }
    return Promise.resolve();
  }) as chrome.storage.StorageArea['set'];

  const removeImpl = ((keys: string | string[], callback?: () => void) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((k) => store.delete(k));
    if (typeof callback === 'function') {
      callback();
      return;
    }
    return Promise.resolve();
  }) as chrome.storage.StorageArea['remove'];

  const clearImpl = ((callback?: () => void) => {
    store.clear();
    if (typeof callback === 'function') {
      callback();
      return;
    }
    return Promise.resolve();
  }) as chrome.storage.StorageArea['clear'];

  const setAccessLevelImpl = ((
    _options: { accessLevel: chrome.storage.AccessLevel },
    callback?: () => void
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
  const runtimeListeners = new Set<(message: any, sender: any, sendResponse: any) => any>();

  globalWithChrome.chrome = {
    runtime: {
      connect: () => ({ onDisconnect: { addListener: () => undefined } }),
      sendMessage: (message: any, optionsOrCallback?: any, callback?: any) => {
        const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
        runtimeListeners.forEach((listener) => {
          listener(message, { id: 'mock-extension' }, (response: any) => {
            cb?.(response);
          });
        });
        return Promise.resolve(undefined);
      },
      onMessage: {
        addListener: (listener: any) => {
          runtimeListeners.add(listener);
        },
        removeListener: (listener: any) => {
          runtimeListeners.delete(listener);
        },
      },
      onInstalled: {
        addListener: vi.fn(),
      },
      getURL: (path: string) => `chrome-extension://mock-extension-id/${path}`,
      openOptionsPage: vi.fn(),
      lastError: undefined,
    },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com', active: true }]),
      get: vi.fn().mockResolvedValue({ id: 1, url: 'https://example.com', active: true }),
      sendMessage: vi
        .fn()
        .mockImplementation((_tabId: number, _msg: any, optsOrCb?: any, cb?: any) => {
          const callback = typeof optsOrCb === 'function' ? optsOrCb : cb;
          callback?.({ ok: true });
          return Promise.resolve({ ok: true });
        }),
      onUpdated: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      onActivated: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    action: {
      onClicked: {
        addListener: vi.fn(),
      },
    },
    commands: {
      onCommand: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    contextMenus: {
      create: vi.fn(),
      removeAll: vi.fn().mockImplementation((cb?: () => void) => cb?.()),
      onClicked: {
        addListener: vi.fn(),
      },
    },
    offscreen: {
      createDocument: vi.fn().mockResolvedValue(undefined),
      closeDocument: vi.fn().mockResolvedValue(undefined),
      hasDocument: vi.fn().mockResolvedValue(false),
    },
    sidePanel: {
      setOptions: vi.fn().mockResolvedValue(undefined),
      open: vi.fn().mockResolvedValue(undefined),
    },
    storage: {
      local: createStorageArea(),
      sync: createStorageArea(),
      session: createStorageArea(),
      managed: createStorageArea(),
      onChanged: mockStorageChangeEmitter as unknown as typeof chrome.storage.onChanged,
    },
    i18n: {
      getMessage: (key: string) => key,
    },
  } as unknown as typeof chrome;
}

type StorageAreaName = 'sync' | 'local' | 'session' | 'managed';

export const emitChromeStorageChange = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: StorageAreaName
) => {
  storageChangeListeners.forEach((listener) => listener(changes, areaName));
};
