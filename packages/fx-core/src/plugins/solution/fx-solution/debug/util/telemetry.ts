// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Json, LocalSettings, SystemError, UserError, v2 } from "@microsoft/teamsfx-api";
import { SolutionTelemetryComponentName } from "../../constants";

enum TelemetryPropertyKey {
  component = "component",
  appId = "appid",
  success = "success",
  errorType = "error-type",
  errorCode = "error-code",
  errorMessage = "error-message",
}

enum TelemetryPropertyValue {
  success = "yes",
  failure = "no",
  userError = "user",
  systemError = "system",
}

export enum TelemetryEventName {
  scaffoldLocalDebugSettings = "scaffoldLocalDebugSettings",
  provisionLocalResource = "provisionLocalResource",
  configLocalResource = "configLocalResource",
}

export class TelemetryUtils {
  static ctx: v2.Context;
  static localAppId: string | undefined;

  public static init(ctx: v2.Context, localSettings?: LocalSettings | Json) {
    TelemetryUtils.ctx = ctx;
    TelemetryUtils.localAppId = localSettings?.teamsApp?.teamsAppId;
  }

  public static sendStartEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    if (!properties) {
      properties = {};
    }
    properties[TelemetryPropertyKey.component] = SolutionTelemetryComponentName;
    if (TelemetryUtils.localAppId) {
      properties[TelemetryPropertyKey.appId] = TelemetryUtils.localAppId;
    }
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(
      `${eventName}-start`,
      properties,
      measurements
    );
  }

  public static sendSuccessEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ) {
    if (!properties) {
      properties = {};
    }
    properties[TelemetryPropertyKey.component] = SolutionTelemetryComponentName;
    if (TelemetryUtils.localAppId) {
      properties[TelemetryPropertyKey.appId] = TelemetryUtils.localAppId;
    }
    properties[TelemetryPropertyKey.success] = TelemetryPropertyValue.success;
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(
      eventName,
      properties,
      measurements,
      errorProps
    );
  }

  public static sendErrorEvent(
    eventName: string,
    err: UserError | SystemError,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ) {
    if (!properties) {
      properties = {};
    }
    properties[TelemetryPropertyKey.component] = SolutionTelemetryComponentName;
    if (TelemetryUtils.localAppId) {
      properties[TelemetryPropertyKey.appId] = TelemetryUtils.localAppId;
    }
    properties[TelemetryPropertyKey.success] = TelemetryPropertyValue.failure;
    if (err instanceof SystemError) {
      properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.systemError;
    } else if (err instanceof UserError) {
      properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.userError;
    }
    properties[TelemetryPropertyKey.errorCode] = `${err.source}.${err.name}`;
    properties[TelemetryPropertyKey.errorMessage] = err.message;
    TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(
      eventName,
      properties,
      measurements,
      errorProps
    );
  }
}
