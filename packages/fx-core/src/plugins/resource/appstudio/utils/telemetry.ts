// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext, SystemError, UserError, v2 } from "@microsoft/teamsfx-api";
import { Constants } from "./../constants";
import { deepCopy } from "../../../../common";
import { PluginNames, REMOTE_TEAMS_APP_TENANT_ID } from "../../../solution/fx-solution/constants";

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
}

export class TelemetryUtils {
  static ctx: PluginContext | v2.Context;

  public static init(ctx: PluginContext | v2.Context) {
    TelemetryUtils.ctx = ctx;
  }

  public static sendStartEvent(
    eventName: string,
    _properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    let properties;
    if (!properties) {
      properties = {};
    } else {
      properties = deepCopy(_properties!);
    }
    properties[TelemetryPropertyKey.component] = Constants.PLUGIN_NAME;
    const tenantId = (this.ctx as PluginContext).envInfo?.state
      .get(PluginNames.SOLUTION)
      ?.get(REMOTE_TEAMS_APP_TENANT_ID);
    if (tenantId) {
      properties[TelemetryPropertyKey.tenantId] = tenantId;
    }
    const teamsAppId = (this.ctx as PluginContext).envInfo?.state
      .get(PluginNames.APPST)
      ?.get(Constants.TEAMS_APP_ID) as string;
    if (teamsAppId) {
      properties[TelemetryPropertyKey.appId] = teamsAppId;
    }
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(
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
    let properties;
    if (!properties) {
      properties = {};
    } else {
      properties = deepCopy(_properties!);
    }
    properties[TelemetryPropertyKey.component] = Constants.PLUGIN_NAME;
    properties[TelemetryPropertyKey.success] = TelemetryPropertyValue.success;
    const tenantId = (this.ctx as PluginContext).envInfo?.state
      .get(PluginNames.SOLUTION)
      ?.get(REMOTE_TEAMS_APP_TENANT_ID);
    if (tenantId) {
      properties[TelemetryPropertyKey.tenantId] = tenantId;
    }
    const teamsAppId = (this.ctx as PluginContext).envInfo?.state
      .get(PluginNames.APPST)
      ?.get(Constants.TEAMS_APP_ID) as string;
    if (teamsAppId) {
      properties[TelemetryPropertyKey.appId] = teamsAppId;
    }
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
  }

  public static sendErrorEvent(
    eventName: string,
    error: SystemError | UserError,
    _properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    let properties;
    if (!properties) {
      properties = {};
    } else {
      properties = deepCopy(_properties!);
    }
    properties[TelemetryPropertyKey.component] = Constants.PLUGIN_NAME;
    if (error instanceof SystemError) {
      properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.SystemError;
    } else if (error instanceof UserError) {
      properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.UserError;
    }
    properties[TelemetryPropertyKey.errorCode] = `${error.source}.${error.name}`;
    properties[TelemetryPropertyKey.errorMessage] = error.message;
    properties[TelemetryPropertyKey.success] = TelemetryPropertyValue.failure;

    const tenantId = (this.ctx as PluginContext).envInfo?.state
      .get(PluginNames.SOLUTION)
      ?.get(REMOTE_TEAMS_APP_TENANT_ID);
    if (tenantId) {
      properties[TelemetryPropertyKey.tenantId] = tenantId;
    }
    const teamsAppId = (this.ctx as PluginContext).envInfo?.state
      .get(PluginNames.APPST)
      ?.get(Constants.TEAMS_APP_ID) as string;
    if (teamsAppId) {
      properties[TelemetryPropertyKey.appId] = teamsAppId;
    }
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(
      eventName,
      properties,
      measurements
    );
  }
}
