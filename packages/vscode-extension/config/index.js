//config/index.js
module.exports = {
  preview: {
    env: process.env.RELEASE === "preview" ? require("./dev.env") : {},
  },
};
