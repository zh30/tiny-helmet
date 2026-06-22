import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerBackgroundHandlers } from '@/entries/background/app';
import { extensionConfig } from '@/shared/config/extension';
import * as storage from '@/shared/platform/storage';

function createEvent() {
  const listeners = new Set<(...args: any[]) => any>();
  return {
    addListener: vi.fn((listener: (...args: any[]) => any) => {
      listeners.add(listener);
    }),
    removeListener: vi.fn((listener: (...args: any[]) => any) => {
      listeners.delete(listener);
    }),
    emit: async (...args: any[]) => {
      const results = [];
      for (const listener of listeners) {
        results.push(await listener(...args));
      }
      return results;
    },
    clear: () => {
      listeners.clear();
    },
  };
}

vi.mock('@/shared/platform/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof storage>();
  return {
    ...actual,
    loadSettings: vi.fn(async () => extensionConfig.defaultSettings),
    saveSettings: vi.fn(async (partial) => ({
      ...extensionConfig.defaultSettings,
      ...partial,
    })),
    subscribeToSettings: vi.fn(() => vi.fn()),
  } satisfies typeof storage;
});

describe('registerBackgroundHandlers', () => {
  const runtimeOnInstalled = createEvent();
  const tabsOnUpdated = createEvent();
  const tabsOnActivated = createEvent();
  const actionOnClicked = createEvent();
  const runtimeOnMessage = createEvent();
  const sidePanelSetOptions = vi.fn(async () => undefined);
  const sidePanelOpen = vi.fn(async () => undefined);
  const tabsGet = vi.fn(async () => ({ id: 7, url: 'https://localhost/docs' }));

  const chromeApi = {
    runtime: {
      onInstalled: runtimeOnInstalled,
      onMessage: runtimeOnMessage,
    },
    tabs: {
      onUpdated: tabsOnUpdated,
      onActivated: tabsOnActivated,
      get: tabsGet,
    },
    action: {
      onClicked: actionOnClicked,
    },
    sidePanel: {
      setOptions: sidePanelSetOptions,
      open: sidePanelOpen,
    },
  } as unknown as typeof chrome;

  beforeEach(() => {
    vi.clearAllMocks();
    runtimeOnInstalled.clear();
    tabsOnUpdated.clear();
    tabsOnActivated.clear();
    actionOnClicked.clear();
    runtimeOnMessage.clear();
  });

  it('initializes default settings on first install', async () => {
    registerBackgroundHandlers(chromeApi, extensionConfig);

    await runtimeOnInstalled.emit({ reason: 'install' });

    expect(storage.saveSettings).toHaveBeenCalledWith(extensionConfig.defaultSettings);
  });

  it('enables and opens the side panel on allowed hosts', async () => {
    registerBackgroundHandlers(chromeApi, extensionConfig);

    await tabsOnUpdated.emit(7, { status: 'complete' }, { id: 7, url: 'https://localhost/docs' });

    expect(sidePanelSetOptions).toHaveBeenCalledWith({
      tabId: 7,
      path: extensionConfig.sidePanel.assetPath,
      enabled: true,
    });
    expect(sidePanelOpen).toHaveBeenCalledWith({ tabId: 7 });
  });

  it('responds to open side panel messages', async () => {
    registerBackgroundHandlers(chromeApi, extensionConfig);
    const sendResponse = vi.fn();
    const listener = runtimeOnMessage.addListener.mock.calls[0]?.[0];

    const keepOpen = listener?.(
      { type: 'crxkit:open-side-panel', payload: undefined },
      { tab: { id: 7 } },
      sendResponse
    );
    await Promise.resolve();

    expect(keepOpen).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ ok: true }));
  });
});
