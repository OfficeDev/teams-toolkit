// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export enum ProjectType {
  API = "api",
  BOT = "bot",
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

  public static readonly questionKey = {
    serviceSelect: "ServiceSelect",
    endpoint: "api-connector-endpoint",
    apiName: "api-connector-name",
    apiType: "api-connector-auth-type",
    apiUserName: "api-connector-user-name",
    apiPassword: "api-connector-password",
  };
}
