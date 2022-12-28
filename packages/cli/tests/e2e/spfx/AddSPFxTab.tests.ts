// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Huihui Wu <huihuiwu@microsoft.com>
 */

import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";
import {
  cleanUpLocalProject,
  cleanupSharePointPackage,
  execAsync,
  execAsyncWithRetry,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnv,
} from "../commonUtils";
import { AppStudioValidator, SharepointValidator } from "../../commonlib";
import { environmentManager } from "@microsoft/teamsfx-core";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("Start a new project", function () {
  let appId: string;
  let appName: string;
  let testFolder: string;
  let projectPath: string;
  beforeEach(async () => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  it(
    "Add SPFx tab to existing project, provision and run SPFx project with React framework",
    { testPlanCaseId: 15675245 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      let command = `teamsfx new --interactive false --app-name ${appName} --capabilities tab-spfx --spfx-framework-type react --spfx-webpart-name helloworld --programming-language typescript`;
      let result = await execAsync(command, {
        cwd: testFolder,
        env: process.env,
        timeout: 0,
      });

      command = `teamsfx add spfx-tab --spfx-webpart-name secondwebpart`;
      result = await execAsync(command, {
        cwd: path.join(testFolder, appName),
        env: process.env,
        timeout: 0,
      });
      expect(result.stderr).to.eq("");
      const config = await fs.readJson(`${projectPath}/SPFx/config/config.json`);
      expect(config["bundles"]["helloworld-web-part"]).exist;
      expect(config["bundles"]["secondwebpart-web-part"]).exist;
      console.log(
        `[Successfully] add feature, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );

      // validation succeed without provision
      command = "teamsfx validate";
      result = await execAsync(command, {
        cwd: path.join(testFolder, appName),
        env: process.env,
        timeout: 0,
      });
      expect(result.stderr).to.eq("");

      // validation local env succeed without local debug
      command = `teamsfx validate --env ${environmentManager.getLocalEnvName()}`;
      result = await execAsync(command, {
        cwd: path.join(testFolder, appName),
        env: process.env,
        timeout: 0,
      });
      expect(result.stderr).to.eq("");

      // provision
      result = await execAsyncWithRetry(`teamsfx provision`, {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      });
      console.log(
        `[Successfully] provision, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );
      expect(result.stderr).to.eq("");

      {
        // Get context
        const context = await readContextMultiEnv(
          projectPath,
          environmentManager.getDefaultEnvName()
        );

        // Only check Teams App existence
        const appStudio = AppStudioValidator.init(context);
        AppStudioValidator.validateTeamsAppExist(appStudio);
      }

      // deploy
      result = await execAsyncWithRetry(`teamsfx deploy`, {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      });
      console.log(`[Successfully] deploy, stdout: '${result.stdout}', stderr: '${result.stderr}'`);
      expect(result.stderr).to.eq("");

      {
        // Validate sharepoint package
        const solutionConfig = await fs.readJson(
          `${projectPath}/SPFx/config/package-solution.json`
        );
        const sharepointPackage = `${projectPath}/SPFx/sharepoint/${solutionConfig.paths.zippedPackage}`;
        appId = solutionConfig["solution"]["id"];
        expect(appId).to.not.be.empty;
        expect(await fs.pathExists(sharepointPackage)).to.be.true;

        // Check if package exsist in App Catalog
        SharepointValidator.init();
        SharepointValidator.validateDeploy(appId);
      }
    }
  );

  afterEach(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
    await cleanupSharePointPackage(appId);
  });
});
