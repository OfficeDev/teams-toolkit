//config/index.js
module.exports = {
  preview: {
    env: process.env.RELEASE === "beta" ? require("./dev.env") : {},
  },
};
