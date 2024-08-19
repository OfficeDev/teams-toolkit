// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import { dictMatcher } from "../../src/common/secretmasker/dict";

describe("secret masker", () => {
  const sandbox = sinon.createSandbox();
  afterEach(async () => {
    sandbox.restore();
  });
  describe("dictMatcher", () => {
    it("exact", async () => {
      const output = dictMatcher.match("'world'");
      assert.equal(output, "exact");
    });
    it("none", async () => {
      const output = dictMatcher.match("wersdfw");
      assert.equal(output, "none");
    });
  });
});
