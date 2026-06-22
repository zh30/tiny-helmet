import { describe, expect, it } from 'vitest';
import { generateManifest, validateExtensionConfig } from '../../../../scripts/lib/manifest.mjs';

const baseConfig = {
  namespace: 'crxkit',
  minimumChromeVersion: '114',
  defaultLocale: 'en',
  manifest: {
    nameMessage: 'extension_name',
    descriptionMessage: 'extension_description',
    version: '0.1.2',
    icons: {
      16: 'public/icon16.png',
      32: 'public/icon32.png',
      48: 'public/icon48.png',
      128: 'public/icon128.png',
    },
  },
  permissions: ['storage', 'tabs', 'sidePanel'],
  hostPermissions: ['<all_urls>'],
  webAccessibleResources: ['public/*', 'contentScript.css'],
  sidePanel: {
    autoOpenDefault: true,
    allowedHosts: ['localhost'],
  },
  settings: {
    theme: 'system',
    pinnedHosts: [],
    sidePanel: { autoOpen: true },
  },
  entries: {
    popup: {
      kind: 'popup',
      input: 'src/entries/popup/main.tsx',
      html: 'src/entries/popup/index.html',
      output: 'popup.html',
    },
    sidePanel: {
      kind: 'side-panel',
      input: 'src/entries/side-panel/main.tsx',
      html: 'src/entries/side-panel/index.html',
      output: 'sidePanel.html',
    },
    background: {
      kind: 'background',
      input: 'src/entries/background/index.ts',
      output: 'background.js',
    },
    contentScript: {
      kind: 'content',
      input: 'src/entries/content/index.ts',
      output: 'contentScript.js',
      css: 'contentScript.css',
      matches: ['<all_urls>'],
      runAt: 'document_idle',
    },
    options: {
      kind: 'options',
      input: 'src/entries/options/main.tsx',
      html: 'src/entries/options/index.html',
      output: 'options.html',
      openInTab: true,
    },
    newTab: {
      kind: 'new-tab',
      input: 'src/entries/new-tab/main.tsx',
      html: 'src/entries/new-tab/index.html',
      output: 'newTab.html',
    },
  },
} as const;

describe('generateManifest', () => {
  it('derives MV3 manifest fields from extension config and package metadata', () => {
    const manifest = generateManifest(baseConfig, { version: '9.8.7' });

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('__MSG_extension_name__');
    expect(manifest.version).toBe('9.8.7');
    expect(manifest.action?.default_popup).toBe('popup.html');
    expect(manifest.side_panel?.default_path).toBe('sidePanel.html');
    expect(manifest.options_ui).toEqual({ page: 'options.html', open_in_tab: true });
    expect(manifest.chrome_url_overrides).toEqual({ newtab: 'newTab.html' });
    expect(manifest.background).toEqual({ service_worker: 'background.js' });
    expect(manifest.content_scripts).toEqual([
      {
        matches: ['<all_urls>'],
        js: ['contentScript.js'],
        run_at: 'document_idle',
      },
    ]);
    expect(manifest.web_accessible_resources).toEqual([
      {
        resources: ['public/*', 'contentScript.css'],
        matches: ['<all_urls>'],
      },
    ]);
  });
});

describe('validateExtensionConfig', () => {
  it('reports duplicate entry outputs and missing locale message keys', () => {
    const invalidConfig = {
      ...baseConfig,
      entries: {
        ...baseConfig.entries,
        duplicatePopup: {
          kind: 'page',
          input: 'src/entries/duplicate/main.tsx',
          html: 'src/entries/duplicate/index.html',
          output: 'popup.html',
        } as const,
      },
    };

    const issues = validateExtensionConfig(invalidConfig, {
      existingPaths: new Set(['src/entries/popup/main.tsx']),
      localeMessages: {
        en: new Set(['extension_name']),
        zh_CN: new Set(['extension_name']),
      },
    });

    expect(issues).toContain('Entry output "popup.html" is used more than once.');
    expect(issues).toContain('Missing locale key "extension_description" in en.');
    expect(issues).toContain('Missing locale key "extension_description" in zh_CN.');
    expect(issues).toContain('Missing entry input "src/entries/duplicate/main.tsx".');
  });
});
