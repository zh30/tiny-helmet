import rootConfig from '../../../extension.config.json';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ExtensionSettings {
  theme: ThemePreference;
  pinnedHosts: string[];
  sidePanel: {
    autoOpen: boolean;
  };
}

export const EXTENSION_NAMESPACE = rootConfig.namespace;
export const SETTINGS_STORAGE_KEY = `${EXTENSION_NAMESPACE}:settings` as const;

interface ExtensionConfigShape {
  namespace: string;
  popup: { assetPath: string };
  sidePanel: { assetPath: string; allowedHosts: readonly string[] };
  background: { assetPath: string };
  contentScript: { matches: string[]; runAt: 'document_idle' };
  defaultSettings: ExtensionSettings;
}

const configuredEntries = rootConfig.entries;
const defaultSettings = rootConfig.settings as ExtensionSettings;
const defaultAllowedHosts = rootConfig.sidePanel.allowedHosts;

export const extensionConfig: ExtensionConfigShape = {
  namespace: rootConfig.namespace,
  popup: {
    assetPath: configuredEntries.popup.output,
  },
  sidePanel: {
    assetPath: configuredEntries.sidePanel.output,
    allowedHosts: defaultAllowedHosts,
  },
  background: {
    assetPath: configuredEntries.background.output,
  },
  contentScript: {
    matches: [...configuredEntries.contentScript.matches],
    runAt: configuredEntries.contentScript.runAt as 'document_idle',
  },
  defaultSettings,
};

export type DefaultAllowedHost = (typeof defaultAllowedHosts)[number];

export function isHostAllowed(hostname: string): boolean {
  return extensionConfig.sidePanel.allowedHosts.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
}
