// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as path from "path";
import * as fs from "fs-extra";

import { DeployMgr } from "../../../../../src/plugins/resource/bot/deployMgr";
import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { genTomorrow, genYesterday } from "./utils";

describe("Deploy Manager", () => {
    describe("Test init", () => {
        let testDir = "";
        beforeEach(async () => {
            testDir = path.join(__dirname, utils.genUUID());
            await fs.ensureDir(testDir);
        });

        afterEach(async () => {
            await fs.remove(testDir);
        });

        it("Config File Existing", async () => {
            // Arrange 
            const deployMgr = new DeployMgr(testDir);
            await deployMgr.init();

            // Act
            await deployMgr.init();
            const lastDeployTime = await deployMgr.getLastDeployTime();

            // Assert
            chai.assert.isTrue(lastDeployTime === 0);
        });
    });
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
            const deployMgr = new DeployMgr(testDir);
            await deployMgr.init();

            const time = Date.now();
            await deployMgr.updateLastDeployTime(time);

            // Act
            const actualTime = await deployMgr.getLastDeployTime();

            // Assert
            chai.assert.isTrue(actualTime === time);
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
            const deployMgr = new DeployMgr(testDir);
            await deployMgr.init();

            await fs.writeFile(path.join(testDir, "index.js"), "anything");
            await deployMgr.updateLastDeployTime(genTomorrow());

            // Act
            const needsRedeploy = await deployMgr.needsToRedeploy();

            // Assert
            chai.assert.isFalse(needsRedeploy);
        });

        it("needsToRedeploy True", async () => {
            // Arrange
            const deployMgr = new DeployMgr(testDir);
            await deployMgr.init();

            await fs.writeFile(path.join(testDir, "index.js"), "anything");
            await deployMgr.updateLastDeployTime(genYesterday());

            // Act
            const needsRedeploy = await deployMgr.needsToRedeploy();

            // Assert
            chai.assert.isTrue(needsRedeploy);
        });
    });
});