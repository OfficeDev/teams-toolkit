// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { cleanUpResourceGroup } from "../clean";
import {
  getTestFolder,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  readContextMultiEnv,
  validateTabAndBotProjectProvision,
  getUniqueAppName,
  execAsyncWithRetry,
} from "../commonUtils";
import { SqlValidator, FunctionValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  before(async () => {
    await cleanUpResourceGroup("dev-rg");
  });
  it(`${TemplateProject.ShareNow}`, { testPlanCaseId: 15277467 }, async function () {
    await CliHelper.createTemplateProject(
      appName,
      testFolder,
      TemplateProject.ShareNow,
      TemplateProject.ShareNow
    );

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    const config = fs.readJSONSync(path.join(projectPath, ".fx", "configs", `config.${env}.json`));
    config["skipAddingSqlUser"] = true;
    fs.writeFileSync(
      path.join(projectPath, ".fx", "configs", `config.${env}.json`),
      JSON.stringify(config)
    );

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    await validateTabAndBotProjectProvision(projectPath, env);

    // await execAsync(`set EXPO_DEBUG=true && npm config set package-lock false`, {
    //   cwd: path.join(projectPath, "tabs"),
    //   env: process.env,
    //   timeout: 0,
    // });

    // const result = await execAsync(`npm i @types/node -D`, {
    //   cwd: path.join(projectPath, "tabs"),
    //   env: process.env,
    //   timeout: 0,
    // });
    // if (!result.stderr) {
    //   console.log("success to run cmd: npm i @types/node -D");
    // } else {
    //   console.log("[failed] ", result.stderr);
    // }

    // deploy
    await execAsyncWithRetry(`teamsfx deploy`, {
      cwd: projectPath,
      env: Object.assign({}, process.env),
      timeout: 0,
    });
    console.log(`[Successfully] deploy for ${projectPath}`);

    // Assert
    {
      const context = await readContextMultiEnv(projectPath, env);

      // Validate Function App
      const functionValidator = new FunctionValidator(context, projectPath, env);
      await functionValidator.validateProvision();
      await functionValidator.validateDeploy();

      // // Validate sql
      // await SqlValidator.init(context);
      // await SqlValidator.validateSql();
    }
  });

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false);
  });
});
