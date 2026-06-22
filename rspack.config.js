// @ts-check

const path = require('node:path');
const { defineConfig } = require('@rspack/cli');
const rspack = require('@rspack/core');
const extensionConfig = require('./extension.config.json');
const packageJson = require('./package.json');

class ExtensionManifestPlugin {
  constructor(manifest) {
    this.manifest = manifest;
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap('ExtensionManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ExtensionManifestPlugin',
          stage: rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        () => {
          compilation.emitAsset(
            'manifest.json',
            new rspack.sources.RawSource(`${JSON.stringify(this.manifest, null, 2)}\n`)
          );
        }
      );
    });
  }
}

async function loadBuildHelpers() {
  const [{ generateManifest }, { createHtmlPluginOptions, createRspackEntries }] =
    await Promise.all([
      import('./scripts/lib/manifest.mjs'),
      import('./scripts/lib/rspack-entries.mjs'),
    ]);

  return { generateManifest, createHtmlPluginOptions, createRspackEntries };
}

/**
 * @param {Record<string, any>} _env
 * @param {Record<string, any>} argv
 */
module.exports = async (_env, argv) => {
  const { generateManifest, createHtmlPluginOptions, createRspackEntries } =
    await loadBuildHelpers();
  const mode = argv?.mode || process.env.NODE_ENV || 'development';
  const isProd = mode === 'production';
  const extensionEnv = process.env.EXTENSION_ENV || (isProd ? 'production' : 'development');
  const manifest = generateManifest(extensionConfig, {
    version: process.env.EXTENSION_VERSION || packageJson.version,
  });

  return defineConfig({
    mode,
    entry: createRspackEntries(extensionConfig, __dirname),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      chunkFilename: '[name].js',
      publicPath: '',
      globalObject: 'self',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      extensionAlias: {
        '.js': ['.ts', '.js'],
        '.mjs': ['.mts', '.mjs'],
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          type: 'javascript/auto',
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                target: 'es2022',
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: !isProd,
                    refresh: !isProd,
                  },
                },
              },
              sourceMaps: !isProd,
            },
          },
        },
        {
          test: /\.css$/i,
          use: [rspack.CssExtractRspackPlugin.loader, 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico|webp|avif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
        {
          test: /\.(woff2?|ttf|otf|eot)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name][ext]',
          },
        },
      ],
    },
    plugins: [
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.EXTENSION_ENV': JSON.stringify(extensionEnv),
        __DEV__: JSON.stringify(!isProd),
      }),
      new rspack.ProvidePlugin({
        process: [require.resolve('process/browser')],
      }),
      new rspack.CssExtractRspackPlugin({
        filename: '[name].css',
      }),
      new ExtensionManifestPlugin(manifest),
      ...createHtmlPluginOptions(extensionConfig, __dirname, isProd).map(
        (options) => new rspack.HtmlRspackPlugin(options)
      ),
      new rspack.CopyRspackPlugin({
        patterns: [
          { from: 'public', to: 'public' },
          { from: '_locales', to: '_locales' },
        ],
      }),
    ],
    devtool: isProd ? false : 'cheap-module-source-map',
    cache: true,
    optimization: {
      minimize: isProd,
      splitChunks: false,
      runtimeChunk: false,
    },
    performance: { hints: false },
    stats: 'errors-warnings',
    watchOptions: {
      ignored: ['**/dist/**', '**/node_modules/**'],
    },
  });
};
