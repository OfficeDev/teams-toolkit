// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

export class Messages {
  public static readonly SomethingIsInvalidWithValue = (
    something: string,
    value: string
  ): [string, string] => [
    getDefaultString("plugins.bot.InvalidValue", something, value),
    getLocalizedString("plugins.bot.InvalidValue", something, value),
  ];
  public static readonly SomethingIsMissing = (something: string): [string, string] => [
    getDefaultString("plugins.bot.SomethingIsMissing", something),
    getLocalizedString("plugins.bot.SomethingIsMissing", something),
  ];
  public static readonly SomethingIsNotExisting = (something: string): [string, string] => [
    getDefaultString("plugins.bot.SomethingNotExisting", something),
    getLocalizedString("plugins.bot.SomethingNotExisting", something),
  ];
  public static readonly FailToProvisionSomeResource = (resource: string): [string, string] => [
    getDefaultString("plugins.bot.FailedToProvision", resource),
    getLocalizedString("plugins.bot.FailedToProvision", resource),
  ];
  public static readonly FailToUpdateConfigs = (something: string): [string, string] => [
    getDefaultString("plugins.bot.FailedToUpdateConfigs", something),
    getLocalizedString("plugins.bot.FailedToUpdateConfigs", something),
  ];
  public static readonly FailToUpdateMessageEndpoint = (endpoint: string): [string, string] => [
    getDefaultString("plugins.bot.FailedUpdateMessageEndpoint", endpoint),
    getLocalizedString("plugins.bot.FailedUpdateMessageEndpoint", endpoint),
  ];
  public static readonly CommandExecutionFailed = (command: string): [string, string] => [
    getDefaultString("plugins.bot.FailToRun", command),
    getLocalizedString("plugins.bot.FailToRun", command),
  ];
  public static readonly FailToCallAppStudioForCheckingAADApp = [
    getDefaultString("plugins.bot.FailToCallAppStudioApi"),
    getLocalizedString("plugins.bot.FailToCallAppStudioApi"),
  ];
  public static readonly SuccessfullyRetrievedTemplateZip = (zipUrl: string): string =>
    getLocalizedString("plugins.bot.SuccessfullyRetrievedZip", zipUrl);
  public static readonly FallingBackToUseLocalTemplateZip = getLocalizedString(
    "plugins.bot.FallingUseLocalTemplate"
  );
  public static readonly ResourceProviderExist = (rp: string): string =>
    getLocalizedString("plugins.bot.ResourceProvider", rp);
  public static readonly BotResourceExist = (where: string): string =>
    getLocalizedString("plugins.bot.BotResourceExists", where);

  public static readonly WorkingDirIsMissing: [string, string] = [
    getDefaultString("plugins.bot.WorkingDirMissing"),
    getLocalizedString("plugins.bot.WorkingDirMissing"),
  ];
  public static readonly FailToGetAzureCreds: [string, string] = [
    getDefaultString("plugins.bot.FailRetrieveAzureCredentials"),
    getLocalizedString("plugins.bot.FailRetrieveAzureCredentials"),
  ];
  public static readonly TryLoginAzure = getLocalizedString("plugins.bot.LoginToAzure");
  public static readonly SkipDeployNoUpdates = getLocalizedString("plugins.bot.SkipDeployment");

  public static readonly ScaffoldingBot = getLocalizedString("plugins.bot.ScaffoldingBot");
  public static readonly SuccessfullyScaffoldedBot = getLocalizedString(
    "plugins.bot.ScaffoldingBotSuccess"
  );

  public static readonly PreProvisioningBot = getLocalizedString("plugins.bot.PreProvisionBot");
  public static readonly ProvisioningBot = getLocalizedString("plugins.bot.ProvisionBot");

  public static readonly PreDeployingBot = getLocalizedString("plugins.bot.PreDeployingBot");
  public static readonly DeployingBot = getLocalizedString("plugins.bot.DeployingBot");
  public static readonly SuccessfullyDeployedBot = getLocalizedString(
    "plugins.bot.DeployingBotSuccess"
  );

  public static readonly GeneratingArmTemplatesBot = getLocalizedString(
    "plugins.bot.GeneratingBotARMTemplates"
  );
  public static readonly SuccessfullyGenerateArmTemplatesBot = getLocalizedString(
    // eslint-disable-next-line no-secrets/no-secrets
    "plugins.bot.GeneratingARMTemplatesSuccess"
  );

  public static readonly UpdatingArmTemplatesBot = getLocalizedString(
    "plugins.bot.UpdateBotARMTemplates"
  );
  public static readonly SuccessfullyUpdateArmTemplatesBot = getLocalizedString(
    // eslint-disable-next-line no-secrets/no-secrets
    "plugins.bot.UpdateBotARMTemplatesSuccess"
  );

  public static readonly SuccessfullyGetExistingBotAadAppCredential = getLocalizedString(
    "plugins.bot.GetBotAADSuccess"
  );
  public static readonly SuccessfullyCreatedBotAadApp = getLocalizedString(
    "plugins.bot.CreateBotAADSuccess"
  );

  public static readonly ProvisioningBotRegistration = getLocalizedString(
    "plugins.bot.ProvisionBotRegistration"
  );
  public static readonly SuccessfullyProvisionedBotRegistration = getLocalizedString(
    "plugins.bot.ProvisionBotRegistrationSuccess"
  );

  // Suggestions
  public static readonly RetryTheCurrentStep = getLocalizedString(
    "suggestions.retryTheCurrentStep"
  );
  public static readonly RecoverConfig = getLocalizedString("plugins.bot.RecoverConfig");
  public static readonly RecreateTheProject: [string, string] = [
    getDefaultString("plugins.bot.RecreateProject"),
    getLocalizedString("plugins.bot.RecreateProject"),
  ];
  public static readonly CheckCommandOutputAndTryToFixIt = getLocalizedString(
    "plugins.bot.CheckCommandOutput"
  );
  public static readonly RunFailedCommand = (command: string, path: string): string =>
    getLocalizedString("plugins.bot.RunFailedCommand", command, path);
  public static readonly DeleteExistingBotChannelRegistration = getLocalizedString(
    // eslint-disable-next-line no-secrets/no-secrets
    "plugins.bot.DeleteExistsAzureBotChannelRegistrations"
  );
  public static readonly DeleteBotAfterAzureAccountSwitching = getLocalizedString(
    "plugins.bot.DelAzureBotChannel"
  );
  public static readonly CheckOutputLogAndTryToFix = getLocalizedString(
    "plugins.bot.CheckLogAndFix"
  );
  public static readonly RegisterRequiredRP = (resourceProviders: string[]): string =>
    getLocalizedString("plugins.bot.RegisterResourceProviderManually", resourceProviders.join(","));
  public static readonly ReopenWorkingDir = (path = ""): string =>
    getLocalizedString("plugins.bot.CheckPathWriteAccess", path);
}
