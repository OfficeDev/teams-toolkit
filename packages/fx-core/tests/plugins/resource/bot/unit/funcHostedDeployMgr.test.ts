// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as path from "path";
import * as fs from "fs-extra";

import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { genTomorrow, genYesterday } from "./utils";
import { FuncHostedDeployMgr } from "../../../../../src/plugins/resource/bot/functionsHostedBot/deployMgr";
const AdmZip = require("adm-zip");

describe("Deploy Manager", () => {
  describe("Test updateLastDeployTime", () => {
    let testDir = "";
    beforeEach(async () => {
      testDir = path.join(__dirname, utils.genUUID());
      await fs.ensureDir(testDir);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it("Happy Path", async () => {
      // Arrange
      const deployMgr = new FuncHostedDeployMgr(testDir, "ut");
      const time = new Date();
      await deployMgr.saveDeploymentInfo(new new AdmZip().toBuffer(), time);

      // Act
      const actualTime = await deployMgr.getLastDeployTime();

      // Assert
      chai.assert.equal(actualTime.getTime(), time.getTime());
    });
  });

  describe("Test needsToRedeploy", () => {
    let testDir = "";
    beforeEach(async () => {
      testDir = path.join(__dirname, utils.genUUID());
      await fs.ensureDir(testDir);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it("Happy Path", async () => {
      // Arrange
      const deployMgr = new FuncHostedDeployMgr(testDir, "ut");
      await fs.writeFile(path.join(testDir, "index.js"), "anything");
      await deployMgr.saveDeploymentInfo(new new AdmZip().toBuffer(), new Date(genTomorrow()));

      // Act
      const needsRedeploy = await deployMgr.needsToRedeploy([]);

      // Assert
      chai.assert.isFalse(needsRedeploy);
    });

    it("needsToRedeploy True", async () => {
      // Arrange
      const deployMgr = new FuncHostedDeployMgr(testDir, "ut");

      await fs.writeFile(path.join(testDir, "index.js"), "anything");
      await deployMgr.saveDeploymentInfo(new new AdmZip().toBuffer(), new Date(genYesterday()));

      // Act
      const needsRedeploy = await deployMgr.needsToRedeploy([]);

      // Assert
      chai.assert.isTrue(needsRedeploy);
    });
  });
});
