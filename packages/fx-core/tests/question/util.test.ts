// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { isValidUrl } from "../../src/question/util";

describe("isValidUrl", () => {
  it("valid url", () => {
    const url = "https://www.bing.com";
    chai.expect(isValidUrl(url)).equals(true);
  });

  it("invalid url", () => {
    const url = "abc";
    chai.expect(isValidUrl(url)).equals(false);
  });
});
