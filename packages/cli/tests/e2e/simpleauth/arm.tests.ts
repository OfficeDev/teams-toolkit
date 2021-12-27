// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";

import { AadValidator, SimpleAuthValidator } from "../../commonlib";
import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  readContextMultiEnv,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { environmentManager, isFeatureFlagEnabled } from "@microsoft/teamsfx-core";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { createResourceGroup } from "../../commonlib/utilities";
import { fileEncoding, ResourceToDeploy, TestFilePath } from "../../commonlib/constants";

describe("Deploy to customized resource group", function () {
  //  Only test when insider feature flag enabled
  if (!isFeatureFlagEnabled(FeatureFlagName.InsiderPreview, true)) {
    return;
  }

  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`tab project can deploy simple auth resource to customized resource group and successfully provision / deploy`, async function () {
    // Create new tab project
    await execAsync(`teamsfx new --interactive false --app-name ${appName}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    // Create empty resource group
    const customizedRgName = "customizedRgName";
    await createResourceGroup(customizedRgName, "eastus", subscription);

    // Customize simple auth bicep files
    await customizeSimpleAuthBicepFilesToCustomizedRg(customizedRgName, projectPath);

    // Provision
    setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // deploy
    await CliHelper.deployProject(ResourceToDeploy.FrontendHosting, projectPath);

    // Assert
    {
      const context = await readContextMultiEnv(
        projectPath,
        environmentManager.getDefaultEnvName()
      );

      // Validate Aad App
      const aad = AadValidator.init(context, false, AppStudioLogin);
      await AadValidator.validate(aad);

      // Validate Simple Auth
      const simpleAuth = SimpleAuthValidator.init(context);
      await SimpleAuthValidator.validate(simpleAuth, aad);
    }
  });

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  async function customizeSimpleAuthBicepFilesToCustomizedRg(
    customizedRgName: string,
    projectPath: string
  ): Promise<void> {
    const provisionFilePath = path.join(projectPath, TestFilePath.provisionFileName);
    let content = await fs.readFile(provisionFilePath, fileEncoding);
    let insertionIndex = content.indexOf(`name: 'simpleAuthProvision'`);

    const paramToAdd = `param customizedRg string = '${customizedRgName}'\r\n`;
    const scopeToAdd = `scope: resourceGroup(customizedRg)\r\n`;
    content =
      paramToAdd +
      content.substring(0, insertionIndex) +
      scopeToAdd +
      content.substring(insertionIndex);
    await fs.writeFile(provisionFilePath, content);
    console.log(`[debug] ${provisionFilePath} `);
    console.log(content);

    const configFilePath = path.join(projectPath, TestFilePath.configFileName);
    content = await fs.readFile(configFilePath, fileEncoding);
    insertionIndex = content.indexOf(`name: 'addTeamsFxSimpleAuthConfiguration'`);
    content =
      paramToAdd +
      content.substring(0, insertionIndex) +
      scopeToAdd +
      content.substring(insertionIndex);
    await fs.writeFile(configFilePath, content);
    console.log(`[debug] ${configFilePath} `);
    console.log(content);

    console.log(
      `Successfully customize ${provisionFilePath} and ${configFilePath} content to deploy simple auth cloud resources to ${customizedRgName}`
    );
  }
});
