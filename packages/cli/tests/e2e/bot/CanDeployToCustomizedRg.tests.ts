// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 */

import * as path from "path";

import { BotValidator } from "../../commonlib";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnv,
  createResourceGroup,
  deleteResourceGroupByName,
  setBotSkuNameToB1Bicep,
  customizeBicepFilesToCustomizedRg,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, ResourceToDeploy } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Deploy to customized resource group", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, false, true, false);
  });

  it(
    `bot project can deploy bot resource to customized resource group and successfully provision / deploy`,
    { testPlanCaseId: 15685614 },
    async function () {
      if (isV3Enabled()) {
        return this.skip();
      }
      // Create new bot project
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);

      // Create empty resource group
      const customizedRgName = `${appName}-customized-rg`;
      await createResourceGroup(customizedRgName, "eastus");

      // Customize simple auth bicep files
      await customizeBicepFilesToCustomizedRg(
        customizedRgName,
        projectPath,
        [`name: 'botProvision'`, `name: 'azureWebAppBotProvision'`],
        [`name: 'teamsFxAzureWebAppBotConfig'`]
      );

      // Provision
      await setBotSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(projectPath);

      // deploy
      await CliHelper.deployProject(ResourceToDeploy.Bot, projectPath);

      // Assert
      {
        const context = await readContextMultiEnv(projectPath, env);

        // Validate Bot
        const bot = new BotValidator(context, projectPath, env);
        await bot.validateProvision(false);
        await bot.validateDeploy();
      }

      await deleteResourceGroupByName(customizedRgName);
    }
  );
});
