// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
import {
  AadValidator,
  BotValidator,
  FrontendValidator,
  SimpleAuthValidator,
} from "../../commonlib";
import { environmentManager, isFeatureFlagEnabled } from "@microsoft/teamsfx-core";
import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setBotSkuNameToB1Bicep,
  readContextMultiEnv,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import "mocha";
import { Capability } from "../../commonlib/utilities";

describe("Add Capabilities", function () {
  //  Only test when insider feature flag enabled
  if (!isFeatureFlagEnabled(FeatureFlagName.InsiderPreview, true)) {
    return;
  }

  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  let appName, projectPath;

  before(async () => {
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it("tab project can add bot capability and provision", async () => {
    // Arrange
    await createProjectWithCapability(appName, testFolder, Capability.Tab);

    // Act
    await addCapabilityToProject(projectPath, Capability.Bot);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await SetSubAndProvisionProject(subscription, projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath);
  });

  it("tab project can add messaging extension capability and provision", async () => {
    // Arrange
    await createProjectWithCapability(appName, testFolder, Capability.Tab);

    // Act
    await addCapabilityToProject(projectPath, Capability.MessagingExtension);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await SetSubAndProvisionProject(subscription, projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath);
  });

  it("bot project can add tab capability and provision", async () => {
    // Arrange
    await createProjectWithCapability(appName, testFolder, Capability.Bot);

    // Act
    await addCapabilityToProject(projectPath, Capability.Tab);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await SetSubAndProvisionProject(subscription, projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath);
  });

  it("messaging extnsion project can add tab capability and provision", async () => {
    // Arrange
    await createProjectWithCapability(appName, testFolder, Capability.MessagingExtension);

    // Act
    await addCapabilityToProject(projectPath, Capability.Tab);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await SetSubAndProvisionProject(subscription, projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath);
  });

  async function createProjectWithCapability(appName: string, testFolder: string, capability) {
    await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities ${capability} `,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(
      `[Successfully] scaffold project to ${path.resolve(
        testFolder,
        appName
      )} with capability ${capability}`
    );
  }

  async function addCapabilityToProject(projectPath: string, capabilityToAdd = Capability.Tab) {
    await execAsync(`teamsfx capability add ${capabilityToAdd}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] add capability ${capabilityToAdd} to ${projectPath}`);
  }

  async function SetSubAndProvisionProject(subscription: string, projectPath: string) {
    // set subscription
    await execAsync(`teamsfx account set --subscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] set subscription for ${projectPath}`);

    // provision
    await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] provision for ${projectPath}`);
  }

  async function validateTabAndBotProjectProvision(projectPath: string) {
    const context = await readContextMultiEnv(projectPath, environmentManager.getDefaultEnvName());

    // Validate Aad App
    const aad = AadValidator.init(context, false, AppStudioLogin);
    await AadValidator.validate(aad);

    // Validate Simple Auth
    const simpleAuth = SimpleAuthValidator.init(context);
    await SimpleAuthValidator.validate(simpleAuth, aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context, true);
    await FrontendValidator.validateProvision(frontend);

    // Validate Bot Provision
    const bot = BotValidator.init(context, true);
    await BotValidator.validateProvision(bot, true);
  }
});
