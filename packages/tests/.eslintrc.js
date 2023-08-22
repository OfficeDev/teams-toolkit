module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  plugins: ["eslint-plugin-local-rules"],
  extends: ["../eslint-plugin-teamsfx/config/shared.js"],
  overrides: [
    {
      files: ["src/**/*.ts"],
      extends: ["../eslint-plugin-teamsfx/config/header.js"],
    },
    {
      files: ["src/e2e/**/*.ts", "src/ui-test/**/*.ts"],
      rules: {
        "local-rules/jsdoc-author": 2,
      },
    },
  ],
};
