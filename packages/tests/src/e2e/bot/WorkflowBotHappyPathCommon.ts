// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 */

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
  readContextMultiEnv,
  readContextMultiEnvV3,
  createResourceGroup,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { it } from "../../commonlib/it";
import { Runtime } from "../../commonlib/constants";
import { Executor } from "../../utils/executor";
import { expect } from "chai";

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

    it("Provision Resource: workflow bot", async function () {
      const cmd =
        runtime === Runtime.Node
          ? `teamsfx new --interactive false --app-name ${appName} --capabilities workflow-bot --programming-language typescript`
          : `teamsfx new --interactive false --runtime ${runtime} --app-name ${appName} --capabilities workflow-bot`;
      await execAsync(cmd, {
        cwd: testFolder,
        env: env,
        timeout: 0,
      });
      console.log(`[Successfully] scaffold to ${projectPath}`);

      // provision
      const result = await createResourceGroup(appName + "-rg", "eastus");
      expect(result).to.be.true;
      process.env["AZURE_RESOURCE_GROUP_NAME"] = appName + "-rg";
      const { success } = await Executor.provision(projectPath, envName);
      expect(success).to.be.true;
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
