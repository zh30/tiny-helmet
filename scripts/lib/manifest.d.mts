export interface ExtensionEntry {
  kind: 'popup' | 'side-panel' | 'options' | 'new-tab' | 'background' | 'content' | 'page';
  input: string;
  output: string;
  html?: string;
  css?: string;
  matches?: readonly string[];
  runAt?: 'document_idle';
  openInTab?: boolean;
}

export interface ExtensionConfig {
  namespace: string;
  minimumChromeVersion: string;
  defaultLocale: string;
  manifest: {
    nameMessage: string;
    descriptionMessage: string;
    version: string;
    icons: Readonly<Record<string, string>>;
  };
  permissions: readonly string[];
  hostPermissions: readonly string[];
  webAccessibleResources: readonly string[];
  sidePanel: {
    autoOpenDefault: boolean;
    allowedHosts: readonly string[];
  };
  settings: {
    theme: 'light' | 'dark' | 'system';
    pinnedHosts: readonly string[];
    sidePanel: {
      autoOpen: boolean;
    };
  };
  entries: Readonly<Record<string, ExtensionEntry>>;
}

export interface ValidationContext {
  existingPaths?: Set<string>;
  localeMessages?: Record<string, Set<string>>;
}

export function generateManifest(
  config: ExtensionConfig,
  packageMeta?: { version?: string }
): chrome.runtime.ManifestV3;

export function validateExtensionConfig(
  config: ExtensionConfig,
  context?: ValidationContext
): string[];

export function assertValidExtensionConfig(
  config: ExtensionConfig,
  context?: ValidationContext
): void;
