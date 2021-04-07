//@ts-check

'use strict';

const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
	mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: {
    extension: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    client: './src/controls/index.tsx'
  },
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, '..', 'out'),
    libraryTarget: 'umd',
    devtoolModuleFilenameTemplate: '../[resource-path]',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`
  },
  devtool: 'source-map',
  externals: {
    express: 'express',
    keytar: 'keytar',
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    'yeoman-environment': 'commonjs2 yeoman-environment',
    'diagnostic-channel-publishers' : 'diagnostic-channel-publishers',
    'applicationinsights-native-metrics': 'applicationinsights-native-metrics',
    'adm-zip': 'adm-zip',
    '@azure-tools/azcopy-node': '@azure-tools/azcopy-node',
    rimraf: 'rimraf',
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.tsx', '.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /(?<!\.d)\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      },
      {
        test: /\.s[ac]ss$/i,
        exclude: /node_modules/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
      }
    ]
  }, plugins: [
    new HtmlWebPackPlugin({ template: './src/commonlib/codeFlowResult/index.html', filename: 'codeFlowResult/index.html' }),
    new CopyPlugin({
      patterns: [
        { from: "./src/debug/dotnetSdk/resource/dotnet-install.sh", to: "debug/dotnetSdk/resource/dotnet-install.sh" },
        { from: "./src/debug/dotnetSdk/resource/dotnet-install.ps1", to: "debug/dotnetSdk/resource/dotnet-install.ps1" },
      ],
    }),

  ]
};
module.exports = config;
