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
  getUniqueAppName,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  validateTabAndBotProjectProvision
} from "../commonUtils";
import { TemplateProject } from "../../commonlib/constants"
import { CliHelper } from "../../commonlib/cliHelper";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";

describe("teamsfx new template", function () {
  let appId: string;
  let appName: string;
  let testFolder: string;
  let sampleName: string;
  let projectPath: string;

  const env = environmentManager.getDefaultEnvName();
  const subscription = getSubscriptionId();
  beforeEach(async () => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  it(`${TemplateProect.HelloWorldTabSSO}`, { testPlanCaseId: 'XXXXXXX' }, async function () {
    await execAsync(`teamsfx new template ${TemplateProject.HelloWorldTabSSO}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    await validateTabAndBotProjectProvision(projectPath, env);

    // deploy
    await CliHelper.deployAll(projectPath);

  });

  afterEach(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
});
