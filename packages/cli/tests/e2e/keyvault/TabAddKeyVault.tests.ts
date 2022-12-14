// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import path from "path";
import "mocha";
import { AadValidator } from "../../commonlib";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
} from "../commonUtils";
import M365Login from "../../../src/commonlib/m365Login";
import { environmentManager } from "@microsoft/teamsfx-core";
import { KeyVaultValidator } from "../../commonlib/keyVaultValidator";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Test Azure Key Vault", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it(`tab + key vault project happy path`, { testPlanCaseId: 15686997 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    // Create tab + key vault project
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureKeyVault);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);

    // provision
    await CliHelper.provisionProject(projectPath);

    // Validate provision
    {
      const context = await readContextMultiEnv(projectPath, env);

      // Validate Aad App
      const aad = AadValidator.init(context, false, M365Login);
      await AadValidator.validate(aad);

      // Validate Key Vault
      const keyVault = new KeyVaultValidator(context, projectPath, env);
      await keyVault.validate();
    }
  });
});
