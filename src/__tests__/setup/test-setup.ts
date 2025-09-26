import '@testing-library/jest-dom/vitest';

const defaultChrome = {
  runtime: {
    connect: () => ({ onDisconnect: { addListener: () => undefined } }),
    sendMessage: () => Promise.resolve(undefined),
    lastError: undefined,
  },
  sidePanel: undefined,
  storage: {
    local: {
      get: () => Promise.resolve<Record<string, unknown>>({}),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    },
    onChanged: {
      addListener: () => undefined,
      removeListener: () => undefined,
      hasListener: () => false,
    },
  },
  i18n: {
    getMessage: (key: string) => key,
  },
};

const globalWithChrome = globalThis as typeof globalThis & {
  chrome?: typeof defaultChrome;
};

const mockStorageChangeEmitter = {
  listeners: new Set<Parameters<NonNullable<typeof chrome.storage['onChanged']>['addListener']>[0]>(),
  addListener(listener: Parameters<NonNullable<typeof chrome.storage['onChanged']>['addListener']>[0]) {
    this.listeners.add(listener);
  },
  removeListener(listener: Parameters<NonNullable<typeof chrome.storage['onChanged']>['removeListener']>[0]) {
    this.listeners.delete(listener);
  },
  emit(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
    this.listeners.forEach((listener) => listener(changes, areaName));
  },
};

if (!globalWithChrome.chrome) {
  globalWithChrome.chrome = {
    ...defaultChrome,
    storage: {
      ...defaultChrome.storage,
      onChanged: mockStorageChangeEmitter,
    },
  };
}

export const emitChromeStorageChange = mockStorageChangeEmitter.emit.bind(mockStorageChangeEmitter);
