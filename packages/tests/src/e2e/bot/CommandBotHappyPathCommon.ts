// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 */

import * as path from "path";

import { it } from "@microsoft/extra-shot-mocha";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { AppStudioValidator, BotValidator } from "../../commonlib";
import { Runtime } from "../../commonlib/constants";
import {
  cleanUp,
  execAsync,
  execAsyncWithRetry,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
  createResourceGroup,
} from "../commonUtils";
import { Executor } from "../../utils/executor";
import { expect } from "chai";

export function happyPathTest(runtime: Runtime): void {
  describe("Provision", function () {
    const testFolder = getTestFolder();
    const appName = getUniqueAppName();
    const projectPath = path.resolve(testFolder, appName);
    const envName = environmentManager.getDefaultEnvName();
    let teamsAppId: string | undefined;

    const env = Object.assign({}, process.env);
    if (runtime === Runtime.Dotnet) {
      env["TEAMSFX_CLI_DOTNET"] = "true";
      if (process.env["DOTNET_ROOT"]) {
        env[
          "PATH"
        ] = `${process.env["DOTNET_ROOT"]}${path.delimiter}${process.env["PATH"]}`;
      }
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
        teamsAppId = context.TEAMS_APP_ID;
        AppStudioValidator.setE2ETestProvider();

        // Validate Bot Provision
        const bot = new BotValidator(context, projectPath, envName);
        await bot.validateProvisionV3(false);
      }

      // deploy
      const cmdStr = "teamsfx deploy";
      await execAsyncWithRetry(cmdStr, {
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

      // publish only run on node
      if (runtime !== Runtime.Dotnet) {
        await execAsyncWithRetry(`teamsfx publish`, {
          cwd: projectPath,
          env: process.env,
          timeout: 0,
        });

        {
          // Validate publish result
          await AppStudioValidator.validatePublish(teamsAppId!);
        }
      }
    });

    this.afterEach(async () => {
      console.log(`[Successfully] start to clean up for ${projectPath}`);
      await cleanUp(appName, projectPath, false, true, false, teamsAppId);
    });
  });
}
