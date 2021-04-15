// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as path from "path";
import * as fs from "fs-extra";

import { DeployMgr } from "../../../../../src/plugins/resource/bot/deployMgr";
import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { genTomorrow } from "./utils";

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
    });
});