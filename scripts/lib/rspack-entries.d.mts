import type { ExtensionConfig } from './manifest.mjs';

export interface HtmlPluginOptions {
  template: string;
  filename: string;
  chunks: string[];
  minify: boolean;
}

export function createRspackEntries(
  config: Pick<ExtensionConfig, 'entries'>,
  rootDir: string
): Record<string, string>;

export function createHtmlPluginOptions(
  config: Pick<ExtensionConfig, 'entries'>,
  rootDir: string,
  minify: boolean
): HtmlPluginOptions[];
