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
          "@typescript-eslint/no-unnecessary-type-assertion": "error",
          "@typescript-eslint/no-for-in-array": "error",
          "@typescript-eslint/no-implied-eval": "error",
          "@typescript-eslint/restrict-plus-operands": "error",
          "@typescript-eslint/restrict-template-expressions": "error",
          // "@typescript-eslint/unbound-method": "error",
      },
    },
  ],
};
