// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 */

import * as path from "path";

import { BotValidator, AppStudioValidator } from "../../commonlib";
import { CliHelper } from "../../commonlib/cliHelper";
import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnv,
  readContextMultiEnvV3,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";
import { it } from "@microsoft/extra-shot-mocha";
import { Runtime } from "../../commonlib/constants";

export function happyPathTest(runtime: Runtime): void {
  describe("Provision", function () {
    const testFolder = getTestFolder();
    const appName = getUniqueAppName();
    const subscription = getSubscriptionId();
    const projectPath = path.resolve(testFolder, appName);
    const envName = environmentManager.getDefaultEnvName();
    let teamsAppId: string | undefined;

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
      await CliHelper.setSubscription(subscription, projectPath, env);

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
        const context = isV3Enabled()
          ? await readContextMultiEnvV3(projectPath, envName)
          : await readContextMultiEnv(projectPath, envName);
        if (isV3Enabled()) {
          teamsAppId = context.TEAMS_APP_ID;
          AppStudioValidator.setE2ETestProvider();
        } else {
          const appStudio = AppStudioValidator.init(context);
          AppStudioValidator.validateTeamsAppExist(appStudio);
          teamsAppId = appStudio.teamsAppId;
        }

        // Validate Bot Provision
        const bot = new BotValidator(context, projectPath, envName);
        if (isV3Enabled()) {
          await bot.validateProvisionV3(false);
        } else {
          await bot.validateProvision(false);
        }
      }

      // deploy
      const cmdStr = isV3Enabled() ? "teamsfx deploy" : "teamsfx deploy bot";
      await execAsyncWithRetry(cmdStr, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });
      console.log(`[Successfully] deploy for ${projectPath}`);

      {
        // Validate deployment

        // Get context
        const context = isV3Enabled()
          ? await readContextMultiEnvV3(projectPath, envName)
          : await readContextMultiEnv(projectPath, envName);

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

      // publish
      await execAsyncWithRetry(`teamsfx publish`, {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      });

      {
        // Validate publish result
        await AppStudioValidator.validatePublish(teamsAppId!);
      }
    });

    this.afterEach(async () => {
      console.log(`[Successfully] start to clean up for ${projectPath}`);
      await cleanUp(appName, projectPath, false, true, false, teamsAppId);
    });
  });
}
