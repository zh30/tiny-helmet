// @ts-check

const path = require('path');
const { defineConfig } = require('@rspack/cli');
const rspack = require('@rspack/core');

module.exports = (_env, argv) => {
  const mode = argv?.mode || process.env.NODE_ENV || 'development';
  const isProd = mode === 'production';
  const extensionEnv = process.env.EXTENSION_ENV || (isProd ? 'production' : 'development');

  return defineConfig({
    mode,
    entry: {
      popup: path.resolve(__dirname, 'src/entries/popup/main.tsx'),
      sidePanel: path.resolve(__dirname, 'src/entries/side-panel/main.tsx'),
      background: path.resolve(__dirname, 'src/entries/background/index.ts'),
      contentScript: path.resolve(__dirname, 'src/entries/content/index.ts'),
    },
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
            filename: 'assets/[name][ext]'
          }
        },
        {
          test: /\.(woff2?|ttf|otf|eot)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name][ext]'
          }
        }
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
      new rspack.HtmlRspackPlugin({
        template: path.resolve(__dirname, 'src/entries/popup/index.html'),
        filename: 'popup.html',
        chunks: ['popup'],
        minify: isProd,
      }),
      new rspack.HtmlRspackPlugin({
        template: path.resolve(__dirname, 'src/entries/side-panel/index.html'),
        filename: 'sidePanel.html',
        chunks: ['sidePanel'],
        minify: isProd,
      }),
      new rspack.CopyRspackPlugin({
        patterns: [
          { from: 'public', to: 'public' },
          { from: 'src/manifest.json', to: 'manifest.json' },
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
