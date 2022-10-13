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
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  readContextMultiEnv,
} from "../commonUtils";
import { SharepointValidator, AppStudioValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";

describe("teamsfx new template", function () {
  let appId: string;
  let appName: string;
  let testFolder: string;
  let projectPath: string;

  const env = environmentManager.getDefaultEnvName();
  const subscription = getSubscriptionId();
  beforeEach(async () => {
    testFolder = getTestFolder();
  });

  it(`${TemplateProject.TodoListSpfx}`, { testPlanCaseId: 15277466 }, async function () {
    appName = "todo-list-SPFx";
    projectPath = path.resolve(testFolder, appName);
    await execAsync(`teamsfx new template ${TemplateProject.TodoListSpfx}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    const config = await fs.readJson(`${projectPath}/SPFx/config/config.json`);
    expect(config["bundles"]["todo-list-web-part"]).exist;

    // {    // validation succeed without provision
    //   const command = "teamsfx validate";
    //   const result = await execAsync(command, {
    //     cwd: path.join(testFolder, appName),
    //     env: process.env,
    //     timeout: 0,
    //   });
    //   expect(result.stderr).to.eq("");

    // }

    // {
    //   // validation local env succeed without local debug
    //   const command = `teamsfx validate --env ${environmentManager.getLocalEnvName()}`;
    //   const result = await execAsync(command, {
    //     cwd: path.join(testFolder, appName),
    //     env: process.env,
    //     timeout: 0,
    //   });
    //   expect(result.stderr).to.eq("");
    // }

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // {
    //   // Get context
    //   const context = await readContextMultiEnv(
    //     projectPath,
    //     environmentManager.getDefaultEnvName()
    //   );

    //   // Only check Teams App existence
    //   const appStudio = AppStudioValidator.init(context);
    //   AppStudioValidator.validateTeamsAppExist(appStudio);
    // }

    // deploy
    await CliHelper.deployAll(projectPath);
  });

  after(async () => {
    await cleanUp(appName, projectPath, true, false, true);
  });
});
