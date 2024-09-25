// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import {
  getResourceGroupNameFromResourceId,
  loadingDefaultPlaceholder,
  loadingOptionsPlaceholder,
  maskSecret,
} from "../../src/common/stringUtils";
import { getLocalizedString } from "../../src/common/localizeUtils";
import { FailedToParseResourceIdError } from "../../src/error";

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
      assert.equal(output, "Bearer <REDACTED:secret>");
    });
    it("input undefined", async () => {
      const output = maskSecret();
      assert.equal(output, "");
    });
  });

  describe("loadingOptionsPlaceholder", () => {
    it("happy path", async () => {
      const output = loadingOptionsPlaceholder();
      assert.equal(output, getLocalizedString("ui.select.LoadingOptionsPlaceholder"));
    });
  });

  describe("loadingDefaultPlaceholder", () => {
    it("happy path", async () => {
      const output = loadingDefaultPlaceholder();
      assert.equal(output, getLocalizedString("ui.select.LoadingDefaultPlaceholder"));
    });
  });

  describe("getResourceGroupNameFromResourceId", () => {
    it("error", async () => {
      try {
        getResourceGroupNameFromResourceId("abc");
      } catch (e) {
        assert.isTrue(e instanceof FailedToParseResourceIdError);
      }
    });
  });
});
