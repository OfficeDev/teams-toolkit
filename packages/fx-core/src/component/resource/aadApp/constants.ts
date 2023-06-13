// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getLocalizedString } from "../../../common/localizeUtils";

export class Constants {
  static oauthAuthorityPrefix = "https://login.microsoftonline.com";
  static aadAppMaxLength = 120;
  static aadAppPasswordDisplayName = "default";

  static maxRetryTimes = 10;
  static statusCodeUserError = 400;
  static statusCodeServerError = 500;

  static permissions = {
    name: "Azure AD App",
    owner: "Owner",
    noPermission: "No Permission",
    type: "M365",
  };

  static aadManifestTemplateFolder = "plugins/resource/aad/manifest";
  static aadManifestTemplateName = "aad.template.json";

  static createOwnerDuplicatedMessage =
    "One or more added object references already exist for the following modified properties: 'owners'.";
}

export class Telemetry {
  static component = "component";
  static errorCode = "error-code";
  static errorType = "error-type";
  static errorMessage = "error-message";
  static userError = "user";
  static systemError = "system";
  static isSuccess = "success";
  static yes = "yes";
  static no = "no";
  static retryTimes = "retry-times";
  static methodName = "method-name";
  static appId = "appid";
  static skip = "skip";
  static signInAudience = "sign-in-audience";
}

export class Plugins {
  static pluginName = "AAD App Registration";
  static pluginNameComplex = "fx-resource-aad-app-for-teams";
  static pluginNameShort = "aad";
  static frontendHosting = "fx-resource-frontend-hosting";
  static teamsBot = "fx-resource-bot";
  static localDebug = "fx-resource-local-debug";
  static solution = "solution";
  static auth = "auth";
}

export class ConfigKeys {
  static applicationIdUri = "applicationIdUris";
  static clientId = "clientId";
  static clientSecret = "clientSecret";
  static objectId = "objectId";
  static oauth2PermissionScopeId = "oauth2PermissionScopeId";
  static frontendEndpoint = "frontendEndpoint";
  static botId = "botId";
  static botEndpoint = "botEndpoint";
  static teamsMobileDesktopAppId = "teamsMobileDesktopAppId";
  static teamsWebAppId = "teamsWebAppId";
  static domain = "domain";
  static endpoint = "endpoint";
  static oauthAuthority = "oauthAuthority";
  static oauthHost = "oauthHost";
  static tenantId = "tenantId";
  static skip = "skipProvision";
  static accessAsUserScopeId = "accessAsUserScopeId";
}

export interface Messages {
  log: string;
  telemetry: string;
}

export class Messages {
  public static readonly getLog = (log: string) => `[${Plugins.pluginName}] ${log}`;
  private static readonly getEventName = (eventName: string) => `${eventName}`;

  static readonly StartCheckPermission: Messages = {
    log: Messages.getLog("Start to check permission"),
    telemetry: Messages.getEventName("check-permission-start"),
  };

  static readonly EndCheckPermission: Messages = {
    log: Messages.getLog("Successfully check permission"),
    telemetry: Messages.getEventName("check-permission"),
  };

  static readonly StartGrantPermission: Messages = {
    log: Messages.getLog("Start to grant permission"),
    telemetry: Messages.getEventName("grant-permission-start"),
  };

  static readonly EndGrantPermission: Messages = {
    log: Messages.getLog("Successfully grant permission"),
    telemetry: Messages.getEventName("grant-permission"),
  };

  static readonly StartListCollaborator: Messages = {
    log: Messages.getLog("Start to list collaborator"),
    telemetry: Messages.getEventName("list-collaborator-start"),
  };

  static readonly EndListCollaborator: Messages = {
    log: Messages.getLog("Successfully list collaborator"),
    telemetry: Messages.getEventName("list-collaborator"),
  };

  static readonly OwnerAlreadyAdded = (userObjectId: string, objectId: string) =>
    getLocalizedString("plugins.aad.OwnerAlreadyAdded", userObjectId, objectId);
}
