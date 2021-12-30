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
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";

describe("Add capabilities", function () {
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

  it("tab project can add bot capability and provision", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    // Act
    await CliHelper.addCapabilityToProject(projectPath, Capability.Bot);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath);
  });

  it("tab project can add messaging extension capability and provision", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    // Act
    await CliHelper.addCapabilityToProject(projectPath, Capability.MessagingExtension);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath);
  });

  it("bot project can add tab capability and provision", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);

    // Act
    await CliHelper.addCapabilityToProject(projectPath, Capability.Tab);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath);
  });

  it("messaging extnsion project can add tab capability and provision", async () => {
    // Arrange
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.MessagingExtension);

    // Act
    await CliHelper.addCapabilityToProject(projectPath, Capability.Tab);

    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Assert
    await validateTabAndBotProjectProvision(projectPath);
  });

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
