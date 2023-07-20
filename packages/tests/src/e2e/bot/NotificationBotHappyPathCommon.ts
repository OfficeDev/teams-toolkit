import * as fs from "fs-extra";
import * as path from "path";

import { BotValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnvV3,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";

import { it } from "@microsoft/extra-shot-mocha";
import { Runtime } from "../../commonlib/constants";

export function happyPathTest(runtime: Runtime): void {
  describe(`Provision for ${runtime}`, function () {
    const testFolder = getTestFolder();
    const appName = getUniqueAppName();
    const subscription = getSubscriptionId();
    const projectPath = path.resolve(testFolder, appName);
    const envName = environmentManager.getDefaultEnvName();

    const env = Object.assign({}, process.env);
    env["TEAMSFX_CONFIG_UNIFY"] = "true";
    env["BOT_NOTIFICATION_ENABLED"] = "true";
    env["TEAMSFX_TEMPLATE_PRERELEASE"] = "alpha";
    if (runtime === Runtime.Dotnet) {
      env["TEAMSFX_CLI_DOTNET"] = "true";
      if (process.env["DOTNET_ROOT"]) {
        env[
          "PATH"
        ] = `${process.env["DOTNET_ROOT"]}${path.delimiter}${process.env["PATH"]}`;
      }
    }

    it("Provision Resource: app service hosted notification", async function () {
      const cmd =
        runtime === Runtime.Node
          ? `teamsfx new --interactive false --app-name ${appName} --capabilities notification --bot-host-type-trigger http-restify --programming-language typescript`
          : `teamsfx new --runtime dotnet --interactive false --app-name ${appName} --capabilities notification --bot-host-type-trigger http-webapi`;
      await execAsync(cmd, {
        cwd: testFolder,
        env: env,
        timeout: 0,
      });
      console.log(`[Successfully] scaffold to ${projectPath}`);

      // provision
      await execAsyncWithRetry(`teamsfx provision`, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });

      console.log(`[Successfully] provision for ${projectPath}`);

      {
        // Validate provision
        // Get context
        const context = await readContextMultiEnvV3(projectPath, envName);

        // Validate Bot Provision
        const bot = new BotValidator(context, projectPath, envName);
        await bot.validateProvisionV3(false);
      }

      // deploy
      await execAsyncWithRetry(`teamsfx deploy`, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });
      console.log(`[Successfully] deploy for ${projectPath}`);

      {
        // Validate deployment

        // Get context
        const context = await readContextMultiEnvV3(projectPath, envName);

        // Validate Bot Deploy
        const bot = new BotValidator(context, projectPath, envName);
        await bot.validateDeploy();
      }

      // test (validate)
      await execAsyncWithRetry(`teamsfx validate --env ${envName}`, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });

      // package
      await execAsyncWithRetry(`teamsfx package --env ${envName}`, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });
    });

    this.afterEach(async () => {
      console.log(`[Successfully] start to clean up for ${projectPath}`);
      await cleanUp(appName, projectPath, false, true, false);
    });
  });
}
