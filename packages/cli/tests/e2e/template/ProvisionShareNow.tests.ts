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
  validateTabAndBotProjectProvision
} from "../commonUtils";
import {
  SqlValidator,
  FunctionValidator
} from "../../commonlib"
import { getUuid } from "../../commonlib/utilities";
import { TemplateProject } from "../../commonlib/constants"
import { CliHelper } from "../../commonlib/cliHelper";
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

  it(`${TemplateProject.ShareNow}`, { testPlanCaseId: 15277467 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.ShareNow);
    await execAsync(`teamsfx new template ${TemplateProject.ShareNow}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath,
      `--sql-admin-name Abc123321 --sql-password Cab232332${getUuid().substring(0, 6)}`);

    // Validate Provision
    await validateTabAndBotProjectProvision(projectPath, env);

    await execAsync(`npm i @types/node -D`, {
      cwd: path.join(projectPath, "tabs"),
      env: process.env,
      timeout: 0,
    });

    // deploy
    await CliHelper.deployAll(projectPath);

    // Assert
    {
      const context = await readContextMultiEnv(projectPath, env);

      // Validate Function App
      const functionValidator = new FunctionValidator(context, projectPath, env);
      await functionValidator.validateProvision();
      await functionValidator.validateDeploy();

      // Validate sql
      await SqlValidator.init(context);
      await SqlValidator.validateSql();
    }


    await cleanUp(appName, projectPath, true, true, false);

  });

});
