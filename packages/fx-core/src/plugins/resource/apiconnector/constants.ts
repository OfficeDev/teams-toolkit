// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export enum ComponentType {
  API = "api",
  BOT = "bot",
}

export enum AuthType {
  BASIC = "basic",
  APIKEY = "apiKey",
  AAD = "aad",
  CERT = "cert",
  CUSTOM = "custom",
}

export enum LanguageType {
  JS = "javascript",
  TS = "typescript",
}

export enum FileType {
  JS = "js",
  TS = "ts",
}
export class Constants {
  public static readonly PLUGIN_NAME = "APIConnector";
  public static readonly pluginNameShort = "api-connector";
  public static readonly commentTemplate = "comment.template";
  public static readonly templateEx = ".template";
  public static readonly envPrefix = "TEAMSFX_API_";

  public static readonly envFileName = ".env.teamsfx.local";
  public static readonly pkgJsonFile = "package.json";
  public static readonly pkgLockFile = "package-lock.json";
  public static readonly sdkName = "@microsoft/teamsfx";
  public static readonly sdkJsName = "@microsft/teams-js";

  public static readonly questionKey = {
    componentsSelect: "ComponentSelect",
    endpoint: "api-connector-endpoint",
    apiName: "api-connector-name",
    apiType: "api-connector-auth-type",
    apiUserName: "api-connector-user-name",
    apiPassword: "api-connector-password",
    apiAppType: "api-connector-app-type",
    apiAppTenentId: "api-connector-app-tenant-id",
    apiAppId: "api-connector-app-id",
  };
}
