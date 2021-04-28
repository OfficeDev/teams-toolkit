// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, SystemError, UserError } from "fx-api";
import { LocalDebugPluginInfo } from "../constants";

enum TelemetryPropertyKey {
    component = "component",
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
    scaffold = "scaffold",
    localDebug = "local-debug",
    postLocalDebug = "post-local-debug",
}

export class TelemetryUtils {
    static ctx: PluginContext;

    public static init(ctx: PluginContext) {
        TelemetryUtils.ctx = ctx;
    }

    public static sendStartEvent(
        eventName: string,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number },
    ) {
        if (!properties) {
            properties = {};
        }
        properties[TelemetryPropertyKey.component] = LocalDebugPluginInfo.pluginName;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(`${LocalDebugPluginInfo.pluginName}/${eventName}-start`, properties, measurements);
    }

    public static sendSuccessEvent(
        eventName: string,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number },
        errorProps?: string[],
    ) {
        if (!properties) {
            properties = {};
        }
        properties[TelemetryPropertyKey.component] = LocalDebugPluginInfo.pluginName;
        properties[TelemetryPropertyKey.success] = TelemetryPropertyValue.success;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(`${LocalDebugPluginInfo.pluginName}/${eventName}`, properties, measurements, errorProps);
    }

    public static sendErrorEvent(
        eventName: string,
        err: UserError | SystemError,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number },
        errorProps?: string[],
    ) {
        if (!properties) {
            properties = {};
        }
        properties[TelemetryPropertyKey.component] = LocalDebugPluginInfo.pluginName;
        properties[TelemetryPropertyKey.success] = TelemetryPropertyValue.failure;
        if (err instanceof SystemError) {
            properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.systemError;
        } else if (err instanceof UserError) {
            properties[TelemetryPropertyKey.errorType] = TelemetryPropertyValue.userError;
        }
        properties[TelemetryPropertyKey.errorCode] = `${err.source}.${err.name}`;
        properties[TelemetryPropertyKey.errorMessage] = err.message;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(`${LocalDebugPluginInfo.pluginName}/${eventName}`, properties, measurements, errorProps);
    }
}
