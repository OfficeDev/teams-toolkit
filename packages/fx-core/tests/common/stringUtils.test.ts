// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import { maskSecret } from "../../src/common/stringUtils";

describe("stringUtils", () => {
  const sandbox = sinon.createSandbox();
  afterEach(async () => {
    sandbox.restore();
  });
  describe("maskSecret", () => {
    it("happy path", async () => {
      const input =
        "Bearer eyJ0eXAiOiJKV1QiLCJub25jZSI6IkZQQVpfd0ZXc2EwdFpCcGMtcXJITFBzQjd6QnJSWmpzbnFTMW";
      const output = maskSecret(input);
      assert.equal(output, "Bearer <REDACTED: secret>");
    });
    it("input undefined", async () => {
      const output = maskSecret();
      assert.equal(output, "");
    });
  });
});
