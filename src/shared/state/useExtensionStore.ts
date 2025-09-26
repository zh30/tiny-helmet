import { create } from 'zustand';
import {
  extensionConfig,
  type ExtensionSettings,
  type ThemePreference,
} from '@/shared/config/extension';
import { loadSettings, saveSettings, subscribeToSettings } from '@/shared/platform/storage';

export type StoreStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ExtensionStore {
  status: StoreStatus;
  settings: ExtensionSettings;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  togglePinnedHost: (host: string) => Promise<void>;
  setSidePanelAutoOpen: (autoOpen: boolean) => Promise<void>;
}

export const useExtensionStore = create<ExtensionStore>((set, get) => ({
  status: 'idle',
  settings: extensionConfig.defaultSettings,
  hydrate: async () => {
    if (get().status === 'loading' || get().status === 'ready') {
      return;
    }

    set({ status: 'loading' });

    try {
      const settings = await loadSettings();
      set({ settings, status: 'ready' });
    } catch (error) {
      console.error('Failed to hydrate extension settings', error);
      set({ status: 'error' });
      throw error;
    }
  },
  setTheme: async (theme) => {
    set((state) => ({ settings: { ...state.settings, theme } }));
    await saveSettings({ theme });
  },
  togglePinnedHost: async (host) => {
    const { settings } = get();
    const nextHosts = settings.pinnedHosts.includes(host)
      ? settings.pinnedHosts.filter((current) => current !== host)
      : [...settings.pinnedHosts, host];

    set({ settings: { ...settings, pinnedHosts: nextHosts } });
    await saveSettings({ pinnedHosts: nextHosts });
  },
  setSidePanelAutoOpen: async (autoOpen) => {
    const { settings } = get();
    const next = {
      ...settings,
      sidePanel: { ...settings.sidePanel, autoOpen },
    };

    set({ settings: next });
    await saveSettings({ sidePanel: next.sidePanel });
  },
}));

if (typeof chrome !== 'undefined') {
  subscribeToSettings((settings) => {
    useExtensionStore.setState({ settings });
  });
}

let hydrationStarted = false;

export async function ensureExtensionHydrated() {
  if (hydrationStarted) {
    return;
  }

  hydrationStarted = true;
  try {
    await useExtensionStore.getState().hydrate();
  } finally {
    const status = useExtensionStore.getState().status;
    if (status !== 'ready') {
      hydrationStarted = false;
    }
  }
}
