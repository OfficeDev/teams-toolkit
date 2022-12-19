// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  PluginContext,
  SystemError,
  UserError,
  v2,
  ResourceContextV3,
} from "@microsoft/teamsfx-api";
import { Constants } from "../constants";
import { PluginNames, REMOTE_TEAMS_APP_TENANT_ID, ComponentNames } from "../../../constants";
import { DriverContext } from "../../../driver/interface/commonArgs";

export enum TelemetryPropertyKey {
  component = "component",
  errorType = "error-type",
  errorCode = "error-code",
  errorMessage = "error-message",
  validationResult = "validation-result",
  updateExistingApp = "update",
  success = "success",
  appId = "appid",
  tenantId = "tenant-id",
  publishedAppId = "published-app-id",
  customizedKeys = "customized-manifest-keys",
  manual = "manual",
  statusCode = "status-code",
  url = "url",
  method = "method",
}

enum TelemetryPropertyValue {
  UserError = "user",
  SystemError = "system",
  success = "yes",
  failure = "no",
}

export enum TelemetryEventName {
  scaffold = "scaffold",
  validateManifest = "validate-manifest",
  buildTeamsPackage = "build",
  publish = "publish",
  deploy = "deploy",
  updateManifest = "update-manifest",
  provision = "provision",
  provisionManifest = "provision-manifest",
  postProvision = "post-provision",
  checkPermission = "check-permission",
  grantPermission = "grant-permission",
  listCollaborator = "list-collaborator",
  localDebug = "local-debug",
  init = "init",
  addCapability = "add-capability",
  loadManifest = "load-manifest",
  saveManifest = "save-manifest",
  appStudioApi = "app-studio-api",
  authSvcApi = "auth-svc-api",
}

export class TelemetryUtils {
  static ctx: PluginContext | v2.Context | DriverContext;

  public static init(ctx: PluginContext | v2.Context | DriverContext) {
    TelemetryUtils.ctx = ctx;
  }

  public static sendStartEvent(
    eventName: string,
    _properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    const properties = Object.assign({}, _properties);
    this.addCommonProperty(properties);

    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(
      `${eventName}-start`,
      properties,
      measurements
    );
  }

  public static sendSuccessEvent(
    eventName: string,
    _properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    const properties = Object.assign({}, _properties);
    this.addCommonProperty(properties);
    properties[TelemetryPropertyKey.success] = TelemetryPropertyValue.success;

    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  public static sendErrorEvent(
    eventName: string,
    error: SystemError | UserError,
    _properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    if (!this.ctx) {
      return;
    }
    const properties = Object.assign({}, _properties);
    this.addCommonProperty(properties);

    if (error instanceof SystemError) {
      properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.SystemError;
    } else if (error instanceof UserError) {
      properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.UserError;
    }
    properties[TelemetryPropertyKey.errorCode] = `${error.source}.${error.name}`;
    properties[TelemetryPropertyKey.errorMessage] = error.message;
    properties[TelemetryPropertyKey.success] = TelemetryPropertyValue.failure;

    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(
      eventName,
      properties,
      measurements
    );
  }

  private static addCommonProperty(properties: { [key: string]: string }) {
    let tenantId;
    let teamsAppId;
    if ((this.ctx as PluginContext).envInfo?.state instanceof Map) {
      tenantId = (this.ctx as PluginContext).envInfo?.state
        .get(PluginNames.SOLUTION)
        ?.get(REMOTE_TEAMS_APP_TENANT_ID);
      teamsAppId = (this.ctx as PluginContext).envInfo?.state
        .get(PluginNames.APPST)
        ?.get(Constants.TEAMS_APP_ID) as string;
    } else {
      tenantId = (this.ctx as ResourceContextV3).envInfo?.state[PluginNames.SOLUTION]
        .teamsAppTenantId;
      teamsAppId = (this.ctx as ResourceContextV3).envInfo?.state[ComponentNames.AppManifest]
        .teamsAppId;
    }
    if (tenantId) {
      properties[TelemetryPropertyKey.tenantId] = tenantId;
    }
    if (teamsAppId) {
      properties[TelemetryPropertyKey.appId] = teamsAppId;
    }

    properties[TelemetryPropertyKey.component] = Constants.PLUGIN_NAME;
  }
}
