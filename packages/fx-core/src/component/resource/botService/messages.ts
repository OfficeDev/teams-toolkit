// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zhijie <zhihuan@microsoft.com>
 */
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

export function localString(key: string, ...params: any[]): [string, string] {
  return [getDefaultString(key, ...params), getLocalizedString(key, ...params)];
}
export class Messages {
  public static readonly SomethingIsMissing = (something: string): [string, string] =>
    localString("plugins.bot.SomethingIsMissing", something);

  public static readonly FailToProvisionSomeResource = (resource: string): [string, string] =>
    localString("plugins.bot.FailedToProvision", resource);

  public static readonly FailToUpdateConfigs = (something: string): [string, string] =>
    localString("plugins.bot.FailedToUpdateConfigs", something);

  public static readonly BotRegistrationNotFoundWith = (botId: string): [string, string] =>
    localString("plugins.bot.BotRegistrationNotFoundWith", botId);

  public static readonly FailToUpdateMessageEndpoint = (endpoint: string): [string, string] =>
    localString("plugins.bot.FailedUpdateMessageEndpoint", endpoint);

  public static readonly FailToCallAppStudioForCheckingAADApp = (): [string, string] =>
    localString("plugins.bot.FailToCallAppStudioApi");
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

  public static readonly NotAllowedToAcquireBotFrameworkToken = (): [string, string] =>
    localString("error.appstudio.NotAllowedToAcquireBotFrameworkToken");
  public static readonly BotProvisionReturnsForbiddenResult = (): [string, string] =>
    localString("error.appstudio.BotProvisionReturnsForbiddenResult");
  public static readonly BotProvisionReturnsConflictResult = (): [string, string] =>
    localString("error.appstudio.BotProvisionReturnsConflictResult");
}
