// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import sinon from "sinon";
import * as ProjectSettingsHelper from "../../src/common/projectSettingsHelper";

describe("ProjectSettingsHelper", () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  describe("isTestToolEnabledProject", () => {
    it("test tool yaml exist", async () => {
      sandbox.stub(fs, "pathExistsSync").returns(true);
      const res = ProjectSettingsHelper.isTestToolEnabledProject("testPath");
      assert.isTrue(res);
    });

    it("test tool yaml not exist", async () => {
      sandbox.stub(fs, "pathExistsSync").returns(false);
      const res = ProjectSettingsHelper.isTestToolEnabledProject("testPath");
      assert.isFalse(res);
    });
  });
});
