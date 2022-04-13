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

export enum KeyLocation {
  Header = "request header",
  QueryParams = "query parameter",
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
    componentsSelect: "component",
    endpoint: "endpoint",
    apiName: "name",
    apiType: "auth-type",
    apiUserName: "user-name",
    apiPassword: "password",
    apiAppType: "app-type",
    apiAppTenentId: "app-tenant-id",
    apiAppId: "app-id",
    apiAPIKeyLocation: "key-location",
    apiAPIKeyName: "key-name",
  };
}
