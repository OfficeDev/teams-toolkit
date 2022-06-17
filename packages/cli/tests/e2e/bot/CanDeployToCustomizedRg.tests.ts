// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";

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
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, ResourceToDeploy } from "../../commonlib/constants";
import { customizeBicepFilesToCustomizedRg } from "../commonUtils";

describe("Deploy to customized resource group", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, false, true, false);
  });

  it(`bot project can deploy bot resource to customized resource group and successfully provision / deploy`, async function () {
    // Create new bot project
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);

    // Create empty resource group
    const customizedRgName = `${appName}-customized-rg`;
    await createResourceGroup(customizedRgName, "eastus");

    // Customize simple auth bicep files
    await customizeBicepFilesToCustomizedRg(
      customizedRgName,
      projectPath,
      [`name: 'botProvision'`, `name: 'webAppProvision'`],
      [`name: 'addTeamsFxBotConfiguration'`]
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
  });
});
