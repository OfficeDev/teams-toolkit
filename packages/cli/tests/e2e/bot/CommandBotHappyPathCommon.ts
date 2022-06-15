// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";

import { AadValidator, BotValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnv,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { it } from "../../commonlib/it";
import { Runtime } from "../../commonlib/constants";

export function happyPathTest(runtime: Runtime): void {
  describe("Provision", function () {
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
    }

    it("Provision Resource: command and response", async function () {
      const cmd =
        runtime === Runtime.Node
          ? `teamsfx new --interactive false --app-name ${appName} --capabilities command-bot --programming-language typescript`
          : `teamsfx new --interactive false --runtime ${runtime} --app-name ${appName} --capabilities command-bot`;
      await execAsync(cmd, {
        cwd: testFolder,
        env: env,
        timeout: 0,
      });
      console.log(`[Successfully] scaffold to ${projectPath}`);

      // set subscription
      await execAsync(`teamsfx account set --subscription ${subscription}`, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });

      console.log(`[Successfully] set subscription for ${projectPath}`);

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
        const context = await readContextMultiEnv(projectPath, envName);

        // Validate Bot Provision
        const bot = new BotValidator(context, projectPath, envName);
        await bot.validateProvision(false);
      }

      // deploy
      await execAsyncWithRetry(`teamsfx deploy bot`, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });
      console.log(`[Successfully] deploy for ${projectPath}`);

      {
        // Validate deployment

        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

        // Validate Bot Deploy
        const bot = new BotValidator(context, projectPath, envName);
        await bot.validateDeploy();
      }

      // test (validate)
      await execAsyncWithRetry(`teamsfx validate`, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });

      // package
      await execAsyncWithRetry(`teamsfx package`, {
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
