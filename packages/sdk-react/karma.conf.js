process.env.CHROME_BIN = require("puppeteer").executablePath();

module.exports = function (config) {
  config.set({
    frameworks: ["mocha", "karma-typescript"],

    files: [{ pattern: "test/*.test.ts" }],

    preprocessors: {
      "**/*.ts": ["karma-typescript"],
    },

    reporters: ["dots", "karma-typescript"],

    browsers: ["ChromeHeadless"],

    singleRun: true,
  });
};
