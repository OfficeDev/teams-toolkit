// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
import "mocha";
import { AadValidator, BotValidator } from "../../commonlib";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnv,
  setBotSkuNameToB1Bicep,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { KeyVaultValidator } from "../../commonlib/keyVaultValidator";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";

describe("Test Azure Key Vault", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, false, true, false);
  });

  it(`bot + key vault project happy path`, async function () {
    // Create bot + key vault project
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureKeyVault);

    await setBotSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);

    // Provision
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    {
      const context = await readContextMultiEnv(projectPath, env);

      // Validate Bot
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateProvision(false);

      // Validate Key Vault
      const keyVault = new KeyVaultValidator(context, projectPath, env);
      await keyVault.validate();
    }
  });
});
