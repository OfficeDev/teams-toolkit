// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext, SystemError, UserError } from "@microsoft/teamsfx-api";
import { Constants } from "./../constants";

export enum TelemetryPropertyKey {
    component = "component",
    errorType = "error-type",
    errorCode = "error-code",
    errorMessage = "error-message",
    validationResult = "validation-result"
}

enum TelemetryPropertyValue {
    UserError = "UserError",
    SystemError = "SystemError",
    UnhandledError = "UnhandledError"
}

export enum TelemetryEventName {
    validateManifest = "validateManifest",
    buildTeamsPackage = "buildTeamsPackage",
    publish = "publish"
}

export class TelemetryUtils {
    static ctx: PluginContext;

    public static init(ctx: PluginContext) {
        TelemetryUtils.ctx = ctx;
    }

    public static sendStartEvent(
        eventName: string,
        properties?: {[key: string]: string},
        measurements?: { [key: string]: number }
    ) {
        if (!properties) {
            properties = {};
        }
        properties[TelemetryPropertyKey.component] = Constants.PLUGIN_NAME;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(`${eventName}-start`, properties, measurements);
    }

    public static sendSuccessEvent(
        eventName: string,
        properties?: {[key: string]: string},
        measurements?: { [key: string]: number }
    ) {
        if (!properties) {
            properties = {};
        }
        properties[TelemetryPropertyKey.component] = Constants.PLUGIN_NAME;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(`${eventName}-succeed`, properties, measurements);
    }

    public static sendErrorEvent(
        eventName: string,
        error: SystemError | UserError,
        properties?: {[key: string]: string},
        measurements?: { [key: string]: number }
    ) {
        if (!properties) {
            properties = {};
        }
        properties[TelemetryPropertyKey.component] = Constants.PLUGIN_NAME;
        if (error instanceof SystemError) {
            properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.SystemError;
        } else if (error instanceof UserError) {
            properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.UserError;
        } else {
            properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.UnhandledError;
        }
        properties[TelemetryPropertyKey.errorCode] = `${error.source}.${error.name}`;
        properties[TelemetryPropertyKey.errorMessage] = error.message;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements);
    }
}