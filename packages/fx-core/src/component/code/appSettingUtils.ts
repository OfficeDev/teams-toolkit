// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ResourceContextV3, Result, SystemError, ok, FxError } from "@microsoft/teamsfx-api";
import path from "path";
import { AadAppOutputs, BotServiceOutputs, ComponentNames } from "../constants";
import fs from "fs-extra";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { SolutionError, SolutionSource } from "../constants";

export class AppSettingConstants {
  static DevelopmentFileName = "appsettings.Development.json";
  static Placeholders = {
    clientId: "$clientId$",
    clientSecret: "$client-secret$",
    oauthAuthority: "$oauthAuthority$",
    botId: "$botId$",
    botPassword: "$bot-password$",
    applicationIdUri: "$applicationIdUri$",
    initiateLoginEndpoint: "$initiateLoginEndpoint$",
  };
}

enum Scenario {
  BlazorTab,
  Bot,
  SsoBot,
}

export function replaceBlazorAppSettings(context: ResourceContextV3, appSettings: string): string {
  return replaceAppSettings(context, appSettings, Scenario.BlazorTab);
}

export function replaceBotAppSettings(
  context: ResourceContextV3,
  appSettings: string,
  sso = false
): string {
  return sso
    ? replaceAppSettings(context, appSettings, Scenario.SsoBot)
    : replaceAppSettings(context, appSettings, Scenario.Bot);
}

function replaceAppSettings(
  context: ResourceContextV3,
  appSettings: string,
  scenario: Scenario
): string {
  function escapeRegExp(s: string): RegExp {
    return new RegExp(s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"), "g");
  }
  function _replace(
    searchValue: string,
    newValue?: string,
    transform: (v?: string) => string | undefined = (v) => v
  ): string {
    const searchRegExp = escapeRegExp(searchValue);
    return appSettings.replace(searchRegExp, transform(newValue) ?? searchValue);
  }

  if (scenario === Scenario.SsoBot || scenario === Scenario.Bot) {
    appSettings = _replace(
      AppSettingConstants.Placeholders.botId,
      context.envInfo.state?.[ComponentNames.TeamsBot]?.[BotServiceOutputs.botId.key]
    );
    appSettings = _replace(
      AppSettingConstants.Placeholders.botPassword,
      context.envInfo.state?.[ComponentNames.TeamsBot]?.[BotServiceOutputs.botPassword.key]
    );
  }

  if (scenario === Scenario.SsoBot) {
    appSettings = _replace(
      AppSettingConstants.Placeholders.applicationIdUri,
      context.envInfo.state?.[ComponentNames.AadApp]?.[AadAppOutputs.applicationIdUris.key]
    );
    appSettings = _replace(
      AppSettingConstants.Placeholders.initiateLoginEndpoint,
      context.envInfo.state?.[ComponentNames.AadApp]?.[AadAppOutputs.botEndpoint.key],
      (v) => (v ? `${v}/bot-auth-start` : v)
    );
  }

  if (scenario === Scenario.SsoBot || scenario === Scenario.BlazorTab) {
    appSettings = _replace(
      AppSettingConstants.Placeholders.clientId,
      context.envInfo.state?.[ComponentNames.AadApp]?.[AadAppOutputs.clientId.key]
    );
    appSettings = _replace(
      AppSettingConstants.Placeholders.clientSecret,
      context.envInfo.state?.[ComponentNames.AadApp]?.[AadAppOutputs.clientSecret.key]
    );
    appSettings = _replace(
      AppSettingConstants.Placeholders.oauthAuthority,
      context.envInfo.state?.[ComponentNames.AadApp]?.[AadAppOutputs.oauthAuthority.key]
    );
  }
  return appSettings;
}

export async function resetAppSettingsDevelopment(
  projectPath: string
): Promise<Result<undefined, FxError>> {
  const appSettingsDevPath = path.join(projectPath, AppSettingConstants.DevelopmentFileName);

  try {
    if (await fs.pathExists(appSettingsDevPath)) {
      const appSettings = await fs.readJson(appSettingsDevPath);
      if (appSettings.TeamsFx) {
        if (appSettings.TeamsFx.Authentication) {
          appSettings.TeamsFx.Authentication.ClientId = AppSettingConstants.Placeholders.clientId;
          appSettings.TeamsFx.Authentication.ClientSecret =
            AppSettingConstants.Placeholders.clientSecret;
          appSettings.TeamsFx.Authentication.OAuthAuthority =
            AppSettingConstants.Placeholders.oauthAuthority;
          if (appSettings.TeamsFx.Authentication.ApplicationIdUri) {
            appSettings.TeamsFx.Authentication.ApplicationIdUri =
              AppSettingConstants.Placeholders.applicationIdUri;
          }

          if (
            appSettings.TeamsFx.Authentication.Bot &&
            appSettings.TeamsFx.Authentication.Bot.InitiateLoginEndpoint
          ) {
            appSettings.TeamsFx.Authentication.Bot.InitiateLoginEndpoint =
              AppSettingConstants.Placeholders.initiateLoginEndpoint;
          }
        }
      }
      if (appSettings["BOT_ID"]) {
        appSettings["BOT_ID"] = AppSettingConstants.Placeholders.botId;
      }

      if (appSettings["BOT_PASSWORD"]) {
        appSettings["BOT_PASSWORD"] = AppSettingConstants.Placeholders.botPassword;
      }
      await fs.writeFile(appSettingsDevPath, JSON.stringify(appSettings, null, "\t"), "utf-8");
    }
    return ok(undefined);
  } catch (e) {
    const error = new SystemError(
      SolutionSource,
      SolutionError.FailedToResetAppSettingsDevelopment,
      getDefaultString("core.appSettingsUtil.FailedToResetAppSettingsDevelopment"),
      getLocalizedString("core.appSettingsUtil.FailedToResetAppSettingsDevelopment")
    );
    return err(error);
  }
}
