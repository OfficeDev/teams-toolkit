"use strict";

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint/eslint-plugin",
    "prettier",
    "no-secrets",
    "header",
    "@microsoft/eslint-plugin-teamsfx",
  ],
  overrides: [
    {
      files: ["*.ts"],
      rules: {
        "header/header": [
          "error",
          "line",
          [
            " Copyright (c) Microsoft Corporation.",
            " Licensed under the MIT license.",
          ],
        ],
      },
    },
  ],
};
