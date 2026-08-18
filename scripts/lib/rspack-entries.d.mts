import type { ExtensionConfig, ExtensionEntry } from './manifest.d.mts';

export interface CreateHtmlPluginOptionsConfig {
  vendorChunk?: string;
  splitVendor?: boolean;
}

export type ConfigWithEntries =
  | ExtensionConfig
  | {
      entries?: Readonly<
        Record<string, Partial<ExtensionEntry> & { input: string; output: string; html?: string }>
      >;
    };

export function createRspackEntries(
  config: ConfigWithEntries,
  rootDir: string
): Record<string, string>;

export interface HtmlPluginOption {
  template: string;
  filename: string;
  chunks: string[];
  chunksSortMode?: string;
  minify: boolean;
}

export function createHtmlPluginOptions(
  config: ConfigWithEntries,
  rootDir: string,
  minify: boolean,
  options?: CreateHtmlPluginOptionsConfig
): HtmlPluginOption[];
