const path = require("path");

const nlsFilePath = path.resolve("./resource/package.nls.json");

module.exports = {
  extends: ["../eslint-plugin-teamsfx/config/shared.js"],
  plugins: ["@microsoft/eslint-plugin-teamsfx"],
  rules: {
    "@microsoft/teamsfx/unused-string": ["error", { jsonFilePath: nlsFilePath }],
  },
};
