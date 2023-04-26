module.exports = {
  extends: ["../eslint-plugin-teamsfx/config/shared.js"],
  plugins: ["@microsoft/eslint-plugin-teamsfx"],
  rules: { 
    "unused-string": ["error", {"jsonFilePath": "resource/package.nls.json"}]
  }
};
