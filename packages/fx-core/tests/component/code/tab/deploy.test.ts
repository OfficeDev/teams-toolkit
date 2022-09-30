// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import { FrontendDeployment } from "../../../../src/component/code/tab/deploy";
import { createSandbox } from "sinon";
import * as utils from "../../../../src/component/utils/fileOperation";
import path from "path";
import { envFileNamePrefix } from "../../../../src/component/code/tab/env";

chai.use(chaiAsPromised);
describe("FrontendDeploy", async () => {
  const envName = "test";
  const today = new Date();
  const yesterday = new Date();
  const tomorrow = new Date();
  yesterday.setDate(today.getDate() - 1);
  tomorrow.setDate(today.getDate() + 1);

  describe("needBuild", async () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });
    it("some files changed since last build", async () => {
      sandbox
        .stub(fs, "readJSON")
        .resolves({ [envName]: { lastBuildTime: yesterday.toISOString() } });
      sandbox.stub(utils, "forEachFileAndDir").callsFake(async (root, cb) => {
        cb(path.join(root, "dir"), { mtime: today } as any);
      });
      const result = await FrontendDeployment.needBuild("tabs", envName);
      chai.assert.isTrue(result);
    });

    it("nothing changed since last build", async () => {
      sandbox.stub(fs, "readJSON").resolves({ [envName]: { lastBuildTime: today.toISOString() } });
      sandbox.stub(utils, "forEachFileAndDir").callsFake(async (root, cb) => {
        cb(path.join(root, "dir"), { mtime: yesterday } as any);
        cb(path.join(root, envFileNamePrefix + "test2"), { mtime: tomorrow } as any);
      });
      const result = await FrontendDeployment.needBuild("tabs", envName);
      chai.assert.isFalse(result);
    });
  });

  describe("needDeploy", () => {
    const sandbox = createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    it("have built since last deployment", async () => {
      sandbox.stub(fs, "readJSON").resolves({
        [envName]: {
          lastBuildTime: today.toISOString(),
          lastDeployTime: yesterday.toISOString(),
        },
      });
      const result = await FrontendDeployment.needDeploy("tabs", envName);
      chai.assert.isTrue(result);
    });

    it("no built since last deployment", async () => {
      sandbox.stub(fs, "readJSON").resolves({
        [envName]: {
          lastBuildTime: yesterday.toISOString(),
          lastDeployTime: today.toISOString(),
        },
      });
      const result = await FrontendDeployment.needDeploy("tabs", envName);
      chai.assert.isFalse(result);
    });
  });
});
