// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as path from "path";
import * as fs from "fs-extra";

import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { genTomorrow, genYesterday } from "./utils";
import { FuncHostedDeployMgr } from "../../../../../src/plugins/resource/bot/functionsHostedBot/deployMgr";
import AdmZip from "adm-zip";

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
      await deployMgr.saveDeploymentInfo(new AdmZip().toBuffer(), time);

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
      await deployMgr.saveDeploymentInfo(new AdmZip().toBuffer(), new Date(genTomorrow()));

      // Act
      const needsRedeploy = await deployMgr.needsToRedeploy([]);

      // Assert
      chai.assert.isFalse(needsRedeploy);
    });

    it("needsToRedeploy True", async () => {
      // Arrange
      const deployMgr = new FuncHostedDeployMgr(testDir, "ut");

      await fs.writeFile(path.join(testDir, "index.js"), "anything");
      await deployMgr.saveDeploymentInfo(new AdmZip().toBuffer(), new Date(genYesterday()));

      // Act
      const needsRedeploy = await deployMgr.needsToRedeploy([]);

      // Assert
      chai.assert.isTrue(needsRedeploy);
    });
  });

  describe("Test zipAFolder", () => {
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

      // Act
      const buffer = await deployMgr.zipAFolder([]);

      // Assert
      const res = new AdmZip(buffer);
      const zipFiles = res.getEntries();
      chai.assert.equal(zipFiles.length, 1);
    });

    it("Ignore rule", async () => {
      // Arrange
      const deployMgr = new FuncHostedDeployMgr(testDir, "ut");
      await fs.writeFile(path.join(testDir, "index.js"), "anything");

      // Act
      const buffer = await deployMgr.zipAFolder(["index.js"]);

      // Assert
      const res = new AdmZip(buffer);
      const zipFiles = res.getEntries();
      chai.assert.equal(zipFiles.length, 0);
    });

    it("Zip twice", async () => {
      // Arrange
      const deployMgr = new FuncHostedDeployMgr(testDir, "ut");
      await fs.writeFile(path.join(testDir, "exclude.js"), "anything");
      await fs.writeFile(path.join(testDir, "same.js"), "anything");
      await fs.writeFile(path.join(testDir, "update.js"), "anything");
      await fs.writeFile(path.join(testDir, "delete.js"), "anything");
      await deployMgr.zipAFolder(["exclude.js"]);
      await fs.remove(path.join(testDir, "delete.js"));
      await fs.writeFile(path.join(testDir, "update.js"), "update");
      await fs.writeFile(path.join(testDir, "add.js"), "anything");

      // Act
      const buffer2 = await deployMgr.zipAFolder(["exclude.js"]);

      // Assert
      const res = new AdmZip(buffer2);
      const zipFiles = res.getEntries().map((e) => e.name);
      chai.assert.equal(zipFiles.length, 3);
      chai.assert.sameMembers(zipFiles, ["add.js", "same.js", "update.js"]);
    });
  });
});
