// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";

import { SqlValidator } from "../../commonlib";
import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
  createResourceGroup,
  deleteResourceGroupByName,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { environmentManager, isFeatureFlagEnabled } from "@microsoft/teamsfx-core";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource, ResourceToDeploy } from "../../commonlib/constants";
import { customizeBicepFilesToCustomizedRg } from "../commonUtils";
import { getUuid } from "../../commonlib/utilities";

describe("Deploy to customized resource group", function () {
  //  Only test when insider feature flag enabled
  if (!isFeatureFlagEnabled(FeatureFlagName.InsiderPreview, true)) {
    return;
  }

  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  let appName: string, projectPath: string;

  beforeEach(async () => {
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  afterEach(async () => {
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it(`tab project can deploy sql resource to customized resource group and successfully provision`, async function () {
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
    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(
      projectPath,
      `--sql-admin-name Abc123321 --sql-password Cab232332${getUuid().substring(0, 6)}`
    );

    // Assert
    {
      const context = await readContextMultiEnv(
        projectPath,
        environmentManager.getDefaultEnvName()
      );

      // Validate sql
      await SqlValidator.init(context);
      await SqlValidator.validateSql();
      await SqlValidator.validateResourceGroup(customizedRgName);
    }

    await deleteResourceGroupByName(customizedRgName);
  });
});
