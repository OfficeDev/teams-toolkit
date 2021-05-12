// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { Constants, Telemetry } from "../constants";

export class TelemetryUtils {
    static ctx: PluginContext;

    public static init(ctx: PluginContext) {
        TelemetryUtils.ctx = ctx;
    }

    public static sendEvent(
        eventName: string,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number },
    ) {
        if (!properties) {
            properties = {};
        }
    properties[Telemetry.isSuccess] = Telemetry.success;
    properties[Telemetry.component] = Constants.SimpleAuthPlugin.id;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
    }

    public static sendErrorEvent(
        eventName: string,
        errorCode: string,
        errorType: string,
        errorMessage: string,
        properties?: { [key: string]: string },
        measurements?: { [key: string]: number }
    ) {
        if (!properties) {
            properties = {};
        }
        properties[Telemetry.isSuccess] = Telemetry.success;
        properties[Telemetry.component] = Constants.SimpleAuthPlugin.id;
        properties[Telemetry.errorCode] = errorCode;
        properties[Telemetry.errorType] = errorType;
        properties[Telemetry.errorMessage] = `${Constants.SimpleAuthPlugin.shortName}.${errorMessage}`;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(
            eventName,
            properties,
            measurements,
        );
    }
}
