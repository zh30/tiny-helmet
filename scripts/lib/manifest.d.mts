export interface ExtensionEntry {
  kind:
    | 'popup'
    | 'side-panel'
    | 'options'
    | 'new-tab'
    | 'background'
    | 'content'
    | 'page'
    | 'devtools'
    | 'offscreen'
    | 'injected';
  input: string;
  output: string;
  html?: string;
  css?: string;
  matches?: readonly string[];
  world?: 'ISOLATED' | 'MAIN';
  runAt?: 'document_start' | 'document_end' | 'document_idle';
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
  commands?: Record<
    string,
    {
      suggested_key?: {
        default?: string;
        mac?: string;
        windows?: string;
        chromeos?: string;
        linux?: string;
      };
      description?: string;
    }
  >;
  omnibox?: {
    keyword: string;
  };
  declarativeNetRequest?: {
    rule_resources: Array<{
      id: string;
      enabled: boolean;
      path: string;
    }>;
  };
  firefox?: {
    id?: string;
    minVersion?: string;
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

export interface GenerateManifestOptions {
  version?: string;
  target?: 'chrome' | 'firefox' | 'safari' | 'edge';
}

export function generateManifest(
  config: ExtensionConfig,
  options?: GenerateManifestOptions
): chrome.runtime.ManifestV3;

export function validateExtensionConfig(
  config: ExtensionConfig,
  context?: ValidationContext
): string[];

export function assertValidExtensionConfig(
  config: ExtensionConfig,
  context?: ValidationContext
): void;
