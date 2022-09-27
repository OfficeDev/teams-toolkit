// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

export class Messages {
  public static readonly SomethingIsMissing = (something: string): [string, string] => [
    getDefaultString("plugins.bot.SomethingIsMissing", something),
    getLocalizedString("plugins.bot.SomethingIsMissing", something),
  ];

  public static readonly FailToProvisionSomeResource = (resource: string): [string, string] => [
    getDefaultString("plugins.bot.FailedToProvision", resource),
    getLocalizedString("plugins.bot.FailedToProvision", resource),
  ];
  public static readonly FailToUpdateConfigs = (something: string): [string, string] => [
    getDefaultString("plugins.bot.FailedToUpdateConfigs", something),
    getLocalizedString("plugins.bot.FailedToUpdateConfigs", something),
  ];
  public static readonly BotRegistrationNotFoundWith = (botId: string): [string, string] => [
    getDefaultString("plugins.bot.BotRegistrationNotFoundWith", botId),
    getLocalizedString("plugins.bot.BotRegistrationNotFoundWith", botId),
  ];
  public static readonly FailToUpdateMessageEndpoint = (endpoint: string): [string, string] => [
    getDefaultString("plugins.bot.FailedUpdateMessageEndpoint", endpoint),
    getLocalizedString("plugins.bot.FailedUpdateMessageEndpoint", endpoint),
  ];

  public static readonly FailToCallAppStudioForCheckingAADApp = [
    getDefaultString("plugins.bot.FailToCallAppStudioApi"),
    getLocalizedString("plugins.bot.FailToCallAppStudioApi"),
  ];

  public static readonly BotResourceExist = (where: string): string =>
    getLocalizedString("plugins.bot.BotResourceExists", where);
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
  public static readonly CheckOutputLogAndTryToFix = getLocalizedString(
    "plugins.bot.CheckLogAndFix"
  );
}
