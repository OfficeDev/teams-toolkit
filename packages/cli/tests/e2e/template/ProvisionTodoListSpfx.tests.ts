// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import {
  execAsync,
  getTestFolder,
  setSimpleAuthSkuNameToB1Bicep,
  cleanUpLocalProject,
  getSubscriptionId,
  execAsyncWithRetry,
  getUniqueAppName,
} from "../commonUtils";
import { TemplateProject } from "../../commonlib/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(`${TemplateProject.TodoListSpfx}`, { testPlanCaseId: 15277466 }, async function () {
    if (isV3Enabled()) {
      await CliHelper.openTemplateProject(appName, testFolder, TemplateProject.TodoListSpfx);
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
    } else {
      await CliHelper.createTemplateProject(appName, testFolder, TemplateProject.TodoListSpfx);
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;
    }

    // validation succeed without provision
    await execAsync("teamsfx validate", {
      cwd: path.join(testFolder, appName),
      env: process.env,
      timeout: 0,
    });

    // provision
    if (isV3Enabled()) {
    } else {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
    }
    await CliHelper.provisionProject(projectPath);

    // deploy
    await CliHelper.deployAll(projectPath);
  });

  afterEach(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
