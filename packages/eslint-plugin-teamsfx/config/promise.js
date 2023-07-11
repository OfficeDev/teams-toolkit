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
    project: ['./tsconfig.eslint.json']
  },
  // extends: [
  //   "plugin:@typescript-eslint/recommended-requiring-type-checking",
  // ],
  plugins: [
    "@typescript-eslint/eslint-plugin",
    "prettier",
    "no-secrets",
    "@microsoft/eslint-plugin-teamsfx",
  ],
  overrides: [
    {
      files: ["*.ts"],
      rules: {
          "@typescript-eslint/await-thenable": "error",  
          "@typescript-eslint/no-floating-promises": "error",
          "@typescript-eslint/no-misused-promises": "error",
          "@typescript-eslint/require-await": "error",
      },
    },
  ],
};
