// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";
import * as commonUtils from "../../src/debug/commonUtils";

const testDataFolder = path.resolve(__dirname, "test-data");

describe("[debug > commonUtils]", () => {
  beforeEach(async () => {
    await fs.ensureDir(testDataFolder);
    await fs.emptyDir(testDataFolder);
  });

  describe("isTestToolEnabledProject", () => {
    const sandbox = sinon.createSandbox();

    afterEach(async () => {
      sandbox.restore();
    });

    it("test tool yaml exist", async () => {
      sandbox.stub(fs, "pathExistsSync").returns(true);
      const res = commonUtils.isTestToolEnabledProject("testPath");
      chai.assert.isTrue(res);
    });

    it("test tool yaml not exist", async () => {
      sandbox.stub(fs, "pathExistsSync").returns(false);
      const res = commonUtils.isTestToolEnabledProject("testPath");
      chai.assert.isFalse(res);
    });
  });
});
