"use strict";

module.exports = {
  extends: ["eslint:recommended"],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: ["tests/**/*.js"],
      env: { mocha: true },
    },
  ],
};
