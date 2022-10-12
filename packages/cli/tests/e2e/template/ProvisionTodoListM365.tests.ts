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
  getUniqueAppName
} from "../commonUtils";
import {
  AadValidator,
  FunctionValidator,
  FrontendValidator
} from "../../commonlib"
import { TemplateProject } from "../../commonlib/constants"
import { CliHelper } from "../../commonlib/cliHelper";
import m365Login from "../../../src/commonlib/m365Login";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";

describe("teamsfx new template", function () {
  let appName: string;
  let testFolder: string;
  let projectPath: string;

  const env = environmentManager.getDefaultEnvName();
  const subscription = getSubscriptionId();
  beforeEach(async () => {
    testFolder = getTestFolder();
  });

  it(`${TemplateProject.TodoListM365}`, { testPlanCaseId: 15277470 }, async function () {
    appName = 'todo-list-with-Azure-backend-M365'
    projectPath = path.resolve(testFolder, appName);
    await execAsync(`teamsfx new template ${TemplateProject.TodoListM365}`, {
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
    const context = await readContextMultiEnv(projectPath, env);

    // Validate Aad App
    const aad = AadValidator.init(context, false, m365Login);
    await AadValidator.validate(aad);

    // Validate Function App
    const functionValidator = new FunctionValidator(context, projectPath, env);
    await functionValidator.validateProvision();

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // deploy
    await CliHelper.deployAll(projectPath);

  });

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  })

});
