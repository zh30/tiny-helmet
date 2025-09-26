export type ThemePreference = 'light' | 'dark' | 'system';

export interface ExtensionSettings {
  theme: ThemePreference;
  pinnedHosts: string[];
  sidePanel: {
    autoOpen: boolean;
  };
}

export const EXTENSION_NAMESPACE = 'tiny-helmet';
export const SETTINGS_STORAGE_KEY = `${EXTENSION_NAMESPACE}:settings` as const;

const DEFAULT_ALLOWED_HOSTS = ['localhost', 'zhanghe.dev'] as const;

const defaultSettings: ExtensionSettings = {
  theme: 'system',
  pinnedHosts: [],
  sidePanel: {
    autoOpen: true,
  },
};

interface ExtensionConfigShape {
  popup: { assetPath: string };
  sidePanel: { assetPath: string; allowedHosts: readonly string[] };
  background: { assetPath: string };
  contentScript: { matches: string[]; runAt: 'document_idle' };
  defaultSettings: ExtensionSettings;
}

export const extensionConfig: ExtensionConfigShape = {
  popup: {
    assetPath: 'popup.html',
  },
  sidePanel: {
    assetPath: 'sidePanel.html',
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
  },
  background: {
    assetPath: 'background.js',
  },
  contentScript: {
    matches: ['*://localhost/*', '*://*.zhanghe.dev/*'],
    runAt: 'document_idle',
  },
  defaultSettings,
};

export type DefaultAllowedHost = (typeof DEFAULT_ALLOWED_HOSTS)[number];

export function isHostAllowed(hostname: string): boolean {
  return extensionConfig.sidePanel.allowedHosts.some((allowed) =>
    hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
}
