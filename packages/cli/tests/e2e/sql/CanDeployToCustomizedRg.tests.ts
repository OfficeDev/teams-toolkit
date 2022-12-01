// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import path from "path";

import { SqlValidator } from "../../commonlib";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
  createResourceGroup,
  deleteResourceGroupByName,
  customizeBicepFilesToCustomizedRg,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { getUuid } from "../../commonlib/utilities";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Deploy to customized resource group", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  let appName: string, projectPath: string, env: string;

  beforeEach(async () => {
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
    env = environmentManager.getDefaultEnvName();
  });

  afterEach(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });

  it(
    `tab project can deploy sql resource to customized resource group and successfully provision`,
    { testPlanCaseId: 15687470 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      // Create new tab project
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
      await CliHelper.addResourceToProject(projectPath, Resource.AzureSql);

      // Create empty resource group
      const customizedRgName = `${appName}-customized-rg`;
      await createResourceGroup(customizedRgName, "eastus");

      // Customize simple auth bicep files
      await customizeBicepFilesToCustomizedRg(
        customizedRgName,
        projectPath,
        `name: 'azureSqlProvision'`
      );

      // Provision
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(
        projectPath,
        `--sql-admin-name Abc123321 --sql-password Cab232332${getUuid().substring(0, 6)}`
      );

      // Assert
      {
        const context = await readContextMultiEnv(projectPath, env);

        // Validate sql
        await SqlValidator.init(context);
        await SqlValidator.validateSql();
        await SqlValidator.validateResourceGroup(customizedRgName);
      }

      await deleteResourceGroupByName(customizedRgName);
    }
  );
});
