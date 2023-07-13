"use strict";

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    project: ['./tsconfig.eslint.json']
  },
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  plugins: [
    "@typescript-eslint/eslint-plugin",
    "prettier",
    "no-secrets",
    "header",
    "@microsoft/eslint-plugin-teamsfx",
  ],
  rules: {
    "prettier/prettier": "error",
    quotes: [
      "error",
      "double",
      { allowTemplateLiterals: true, avoidEscape: true },
    ],
    semi: ["error", "always"],
    "@typescript-eslint/no-var-requires": 0,
    "@typescript-eslint/no-empty-function": 0,
    "import/no-cycle": [
      "warn",
      {
        maxDepth: Infinity,
        ignoreExternal: true,
      },
    ],
    "import/no-unresolved": ["warn"],
    "no-secrets/no-secrets": [
      "warn",
      {
        additionalRegexes: {
          "Basic Auth": "Authorization: Basic [A-Za-z0-9+/=]*",
          "Common Pattern":
            "^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[@$!%*#?&])[A-Za-z0-9@$!%*#?&~-]{8,}$",
        },
      },
    ],
  },
  overrides: [
    {
      files: ["src/**/*.ts"],
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
