"use strict";

module.exports = {
  plugins: [
    "header",
  ],
  rules: {
    "header/header": [
      "error",
      "line",
      [
        " Copyright (c) Microsoft Corporation.",
        " Licensed under the MIT license.",
      ],
    ],
  },
};
