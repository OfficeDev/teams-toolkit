module.exports = {
  extends: ["../packages/eslint-plugin-teamsfx/config/shared.js"],
  rules: {
    // Add additional ESLint rules here
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-unused-vars": "error",
    "prefer-const": "error",
    // ...
  },
  globals: {
    // Add global variables here
    process: true,
    // ...
  },
  env: {
    // Add additional environments here
    node: true,
    es6: true,
    // ...
  },
  parserOptions: {
    // Add parser options here
    ecmaVersion: 2021,
    sourceType: "module",
    // ...
  },
  plugins: [
    // Add additional ESLint plugins here
    "eslint-plugin-import",
    // ...
  ],
};
