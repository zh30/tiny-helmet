// @ts-check

const path = require('path');
const { defineConfig } = require('@rspack/cli');
const rspack = require('@rspack/core');

module.exports = (env, argv) => defineConfig({
  entry: {
    popup: './src/popup/popup.tsx',
    background: './src/scripts/background.ts',
    contentScript: './src/scripts/contentScript.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js', 'tsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  pragma: 'React.createElement',
                  pragmaFrag: 'React.Fragment',
                  throwIfNamespace: true,
                  development: false,
                  useBuiltins: false,
                },
              },
            },
          },
        },
        type: 'javascript/auto',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [rspack.CssExtractRspackPlugin.loader, 'css-loader', 'postcss-loader'],
      }
    ],
  },
  plugins: [
    new rspack.CssExtractRspackPlugin({
      filename: '[name].css',
    }),
    new rspack.HtmlRspackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
      minify: true,
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        // { from: 'public', to: 'public' },
        { from: 'src/manifest.json', to: 'manifest.json' },
      ],
    }),
  ],
  mode: argv.mode,
  devtool: argv.mode === 'development' ? 'inline-source-map' : false,
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 8080,
    compress: true,
    hot: true,
    devMiddleware: {
      writeToDisk: true,
    },
  },
});