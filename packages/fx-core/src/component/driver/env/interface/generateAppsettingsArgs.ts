// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface Appsettings {
  BOT_ID?: string;
  BOT_PASSWORD?: string;
  TeamsFx?: TeamsFxArgs;
}

export interface TeamsFxArgs {
  Authentication: AuthenticationArgs;
}

export interface AuthenticationArgs {
  ClientId: string;
  ClientSecret: string;
  OAuthAuthority: string;
  ApplicationIdUri?: string;
  Bot?: BotArgs;
}

export interface BotArgs {
  InitiateLoginEndpoint: string;
}

export interface GenerateAppsettingsArgs {
  target: string; // The path of the appsettings file
  appsettings: Appsettings;
}
