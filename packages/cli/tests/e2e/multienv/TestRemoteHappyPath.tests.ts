// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import {
  AadValidator,
  BotValidator,
  FrontendValidator,
  FunctionValidator,
  SimpleAuthValidator,
  SqlValidator,
} from "../../commonlib";

import {
  cleanUp,
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  mockTeamsfxMultiEnvFeatureFlag,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { deserializeDict } from "@microsoft/teamsfx-core";
import {
  err,
  FxError,
  Result,
  ok,
  ConfigFolderName,
  PublishProfilesFolderName,
  EnvProfileFileNameTemplate,
  EnvNamePlaceholder,
} from "@microsoft/teamsfx-api";
import { expect } from "chai";

// Load envProfile with userdata (not decrypted)
async function loadContext(projectPath: string, env: string): Promise<Result<any, FxError>> {
  const context = await fs.readJson(
    path.join(
      projectPath,
      `.${ConfigFolderName}`,
      PublishProfilesFolderName,
      EnvProfileFileNameTemplate.replace(EnvNamePlaceholder, env)
    )
  );
  const userdataContent = await fs.readFile(
    path.join(projectPath, `.${ConfigFolderName}`, PublishProfilesFolderName, `${env}.userdata`),
    "utf8"
  );
  const userdata = deserializeDict(userdataContent);

  const regex = /\{\{([^{}]+)\}\}/;
  for (const component in context) {
    for (const key in context[component]) {
      const matchResult = regex.exec(context[component][key]);
      if (matchResult) {
        const userdataKey = matchResult[1];
        if (userdataKey in userdata) {
          context[component][key] = userdata[key];
        }
      }
    }
  }
  return ok(context);
}

describe("Create single tab/bot/function", function () {
  const env = "e2e";
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const processEnv = mockTeamsfxMultiEnvFeatureFlag();

  it(`Happy path`, async function () {
    // new a project (tab + bot + function)
    try {
      let result;
      result = await execAsync(
        `teamsfx new --interactive false --app-name ${appName} --capabilities tab bot --azure-resources function sql --programming-language javascript`,
        {
          cwd: testFolder,
          env: processEnv,
          timeout: 0,
        }
      );
      console.log(
        `[Successfully] scaffold to ${projectPath}, stdout: '${result.stdout}', stderr: '${result.stderr}''`
      );

      // set subscription
      result = await execAsync(`teamsfx account set --subscription ${subscription}`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });
      console.log(`[Successfully] set sub, stdout: '${result.stdout}', stderr: '${result.stderr}'`);

      // add env
      result = await execAsync(`teamsfx env add ${env} --env dev`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });
      console.log(`[Successfully] env add, stdout: '${result.stdout}', stderr: '${result.stderr}'`);

      // update SKU from free to B1 to prevent free SKU limit error
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      console.log(`[Successfully] update simple auth sku to B1`);

      // set active env
      result = await execAsync(`teamsfx env activate ${env}`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });
      console.log(
        `[Successfully] env activate, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );

      // list env
      result = await execAsync(`teamsfx env list`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });
      const envs = result.stdout.trim().split(/\r?\n/).sort();
      expect(envs).to.deep.equal(["dev", "e2e (active)"]);
      expect(result.stderr).to.be.empty;
      console.log(
        `[Successfully] env list, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );

      // show env
      result = await execAsync(`teamsfx env`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });
      expect(result.stdout).to.equal("e2e\n");
      expect(result.stderr).to.be.empty;
      console.log(
        `[Successfully] env show, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );

      // provision
      result = await execAsyncWithRetry(
        `teamsfx provision --sql-admin-name e2e --sql-password 'Abc123456%'`,
        {
          cwd: projectPath,
          env: processEnv,
          timeout: 0,
        }
      );
      console.log(
        `[Successfully] provision, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );

      {
        // Validate provision
        // Get context
        const contextResult = await loadContext(projectPath, env);
        if (contextResult.isErr()) {
          throw contextResult.error;
        }
        const context = contextResult.value;

        // Validate Aad App
        const aad = AadValidator.init(context, false, AppStudioLogin);
        await AadValidator.validate(aad);

        // Validate Simple Auth
        const simpleAuth = SimpleAuthValidator.init(context);
        await SimpleAuthValidator.validate(simpleAuth, aad, "B1", true);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context);
        await FrontendValidator.validateProvision(frontend);

        // Validate Function App
        const func = FunctionValidator.init(context);
        await FunctionValidator.validateProvision(func, false);

        // Validate SQL
        await SqlValidator.init(context);
        await SqlValidator.validateSql();

        // Validate Bot Provision
        const bot = BotValidator.init(context);
        await BotValidator.validateProvision(bot);
      }

      // deploy
      await execAsyncWithRetry(`teamsfx deploy`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });

      {
        // Validate provision
        // Get context
        const contextResult = await loadContext(projectPath, env);
        if (contextResult.isErr()) {
          throw contextResult.error;
        }
        const context = contextResult.value;

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context);
        await FrontendValidator.validateDeploy(frontend);

        // Validate Function App
        const func = FunctionValidator.init(context);
        await FunctionValidator.validateDeploy(func);

        // Validate Bot Deploy
        const bot = BotValidator.init(context);
        await BotValidator.validateDeploy(bot);
      }

      // validate
      await execAsyncWithRetry(`teamsfx validate`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });

      {
        /// TODO: add check for validate
      }

      // package
      await execAsyncWithRetry(`teamsfx package`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });

      {
        /// TODO: add check for package
      }
    } catch (e) {
      console.log("Unexpected exception is thrown when running test: " + e);
      console.log(e.stack);
      throw e;
    }
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, true, false, true, env);
  });
});
