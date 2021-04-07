// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FunctionPluginInfo } from "../constants";
import { FxResult } from "../result";
import { PluginContext, SystemError, UserError } from "fx-api";
import { TelemetryKey, TelemetryValue } from "../enums";

export class telemetryHelper {
    static sendStartEvent(
        ctx: PluginContext,
        eventName: string,
        properties: { [key: string]: string } = {},
        measurements: { [key: string]: number } = {},
    ): void {
        properties[TelemetryKey.Component] = FunctionPluginInfo.pluginName;
        properties[TelemetryKey.Success] = TelemetryValue.Success;

        ctx.telemetryReporter?.sendTelemetryEvent(`${eventName}-start`, properties, measurements);
    }

    static sendSuccessEvent(
        ctx: PluginContext,
        eventName: string,
        properties: { [key: string]: string } = {},
        measurements: { [key: string]: number } = {},
    ): void {
        properties[TelemetryKey.Component] = FunctionPluginInfo.pluginName;
        properties[TelemetryKey.Success] = TelemetryValue.Success;

        ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
    }

    static sendErrorEvent(
        ctx: PluginContext,
        eventName: string,
        e: SystemError | UserError,
        properties: { [key: string]: string } = {},
        measurements: { [key: string]: number } = {},
    ): void {
        properties[TelemetryKey.Component] = FunctionPluginInfo.pluginName;
        properties[TelemetryKey.Success] = TelemetryValue.Fail;
        properties[TelemetryKey.ErrorMessage] = e.message;

        if (e instanceof SystemError) {
            properties[TelemetryKey.ErrorType] = TelemetryValue.SystemError;
        } else if (e instanceof UserError) {
            properties[TelemetryKey.ErrorType] = TelemetryValue.UserError;
        }

        ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
    }

    static sendResultEvent(
        ctx: PluginContext,
        eventName: string,
        result: FxResult,
        properties: { [key: string]: string } = {},
        measurements: { [key: string]: number } = {},
    ): void {
        result.match(
            () => this.sendSuccessEvent(ctx, eventName, properties, measurements),
            (e: SystemError | UserError) => this.sendErrorEvent(ctx, eventName, e, properties, measurements)
        );
    }
}
