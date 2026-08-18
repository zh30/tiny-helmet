import path from 'node:path';

export function createRspackEntries(config, rootDir) {
  return Object.fromEntries(
    Object.entries(config.entries ?? {}).map(([name, entry]) => [
      name,
      path.resolve(rootDir, entry.input),
    ])
  );
}

export function createHtmlPluginOptions(config, rootDir, minify, options = {}) {
  const vendorChunk = options.vendorChunk ?? 'vendor';
  const splitVendor = options.splitVendor ?? false;

  return Object.entries(config.entries ?? {})
    .filter(([, entry]) => Boolean(entry.html))
    .map(([name, entry]) => {
      const pluginOption = {
        template: path.resolve(rootDir, entry.html),
        filename: entry.output,
        chunks: splitVendor ? [vendorChunk, name] : [name],
        minify,
      };
      if (splitVendor) {
        pluginOption.chunksSortMode = 'manual';
      }
      return pluginOption;
    });
}
