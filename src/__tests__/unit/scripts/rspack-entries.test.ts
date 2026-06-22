import { describe, expect, it } from 'vitest';
import {
  createHtmlPluginOptions,
  createRspackEntries,
} from '../../../../scripts/lib/rspack-entries.mjs';

const config = {
  entries: {
    popup: {
      kind: 'popup',
      input: 'src/entries/popup/main.tsx',
      html: 'src/entries/popup/index.html',
      output: 'popup.html',
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
    },
  },
} as const;

describe('Rspack entry helpers', () => {
  it('creates named entry paths from extension config', () => {
    expect(createRspackEntries(config, '/repo')).toEqual({
      popup: '/repo/src/entries/popup/main.tsx',
      background: '/repo/src/entries/background/index.ts',
      contentScript: '/repo/src/entries/content/index.ts',
    });
  });

  it('creates HTML plugin options only for entries with templates', () => {
    expect(createHtmlPluginOptions(config, '/repo', true)).toEqual([
      {
        template: '/repo/src/entries/popup/index.html',
        filename: 'popup.html',
        chunks: ['popup'],
        minify: true,
      },
    ]);
  });
});
