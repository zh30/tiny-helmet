import path from 'node:path';

export function createRspackEntries(config, rootDir) {
  return Object.fromEntries(
    Object.entries(config.entries ?? {}).map(([name, entry]) => [
      name,
      path.resolve(rootDir, entry.input),
    ])
  );
}

export function createHtmlPluginOptions(config, rootDir, minify) {
  return Object.entries(config.entries ?? {})
    .filter(([, entry]) => Boolean(entry.html))
    .map(([name, entry]) => ({
      template: path.resolve(rootDir, entry.html),
      filename: entry.output,
      chunks: [name],
      minify,
    }));
}
