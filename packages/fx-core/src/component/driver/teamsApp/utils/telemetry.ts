// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, SystemError, UserError } from "@microsoft/teamsfx-api";
import { DriverContext } from "../../interface/commonArgs";
import { Constants } from "../constants";

export enum TelemetryPropertyKey {
  component = "component",
  errorType = "error-type",
  errorCode = "error-code",
  errorMessage = "error-message",
  updateExistingApp = "update",
  success = "success",
  appId = "appid",
  tenantId = "tenant-id",
  publishedAppId = "published-app-id",
  customizedKeys = "customized-manifest-keys",
  customizedOpenAPIKeys = "customized-openapi-keys",
  validationErrors = "validation-errors",
  validationWarnings = "validation-warnings",
  OverwriteIfAppAlreadyExists = "overwrite-if-app-already-exists",
  region = "region",
}

enum TelemetryPropertyValue {
  UserError = "user",
  SystemError = "system",
  success = "yes",
  failure = "no",
}

export enum TelemetryEventName {
  checkPermission = "check-permission",
  grantPermission = "grant-permission",
  listCollaborator = "list-collaborator",
  appStudioApi = "app-studio-api",
  authSvcApi = "auth-svc-api",
}

export class TelemetryUtils {
  static ctx: Context | DriverContext;

  public static init(ctx: Context | DriverContext) {
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
    properties[TelemetryPropertyKey.component] = Constants.PLUGIN_NAME;
  }
}
