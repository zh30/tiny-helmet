import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitChromeStorageChange } from '@/__tests__/setup/test-setup';
import { extensionConfig } from '@/shared/config/extension';
import * as storage from '@/shared/platform/storage';
import { ensureExtensionHydrated, useExtensionStore } from '@/shared/state/useExtensionStore';

vi.mock('@/shared/platform/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof storage>();

  return {
    ...actual,
    loadSettings: vi.fn(async () => actual.extensionConfig.defaultSettings),
    saveSettings: vi.fn(async () => actual.extensionConfig.defaultSettings),
    subscribeToSettings: vi.fn(() => vi.fn()),
  } satisfies typeof storage;
});

const mockedStorage = storage as unknown as {
  loadSettings: ReturnType<typeof vi.fn>;
  saveSettings: ReturnType<typeof vi.fn>;
  subscribeToSettings: ReturnType<typeof vi.fn>;
};

describe('useExtensionStore', () => {
  beforeEach(() => {
    mockedStorage.loadSettings.mockResolvedValue(extensionConfig.defaultSettings);
    mockedStorage.saveSettings.mockResolvedValue(extensionConfig.defaultSettings);
  });

  afterEach(() => {
    mockedStorage.loadSettings.mockClear();
    mockedStorage.saveSettings.mockClear();
    mockedStorage.subscribeToSettings.mockClear();
    useExtensionStore.setState({
      status: 'idle',
      settings: extensionConfig.defaultSettings,
    });
  });

  it('hydrates settings only once', async () => {
    await act(async () => {
      await Promise.all([ensureExtensionHydrated(), ensureExtensionHydrated()]);
    });

    expect(mockedStorage.loadSettings).toHaveBeenCalledTimes(1);
    expect(useExtensionStore.getState().status).toBe('ready');
  });

  it('sets theme and persists via storage', async () => {
    await act(async () => {
      await ensureExtensionHydrated();
    });

    await act(async () => {
      await useExtensionStore.getState().setTheme('dark');
    });

    expect(mockedStorage.saveSettings).toHaveBeenCalledWith({ theme: 'dark' });
    expect(useExtensionStore.getState().settings.theme).toBe('dark');
  });

  it('updates pinned hosts toggle locally then persists', async () => {
    await act(async () => {
      await ensureExtensionHydrated();
    });

    await act(async () => {
      await useExtensionStore.getState().togglePinnedHost('example.com');
    });

    expect(useExtensionStore.getState().settings.pinnedHosts).toContain('example.com');
    expect(mockedStorage.saveSettings).toHaveBeenCalledWith({ pinnedHosts: ['example.com'] });
  });

  it('responds to storage change events by updating state', async () => {
    await act(async () => {
      await ensureExtensionHydrated();
    });

    emitChromeStorageChange(
      {
        [storage.SETTINGS_STORAGE_KEY]: {
          newValue: {
            ...extensionConfig.defaultSettings,
            theme: 'dark',
          },
        },
      },
      'sync',
    );

    expect(useExtensionStore.getState().settings.theme).toBe('dark');
  });
});
