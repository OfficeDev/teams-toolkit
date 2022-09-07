// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceContextV3 } from "@microsoft/teamsfx-api";
import { AadAppOutputs, BotServiceOutputs, ComponentNames } from "../constants";

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
