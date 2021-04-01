import { PluginContext } from "teamsfx-api";
import { Telemetry } from "../constants";

export class TelemetryUtils {
    static ctx: PluginContext;

    public static init(ctx: PluginContext) {
        TelemetryUtils.ctx = ctx;
    }

    public static sendEvent(eventName: string,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; }) {
        if (!properties) {
            properties = {};
        }
        properties[Telemetry.component] = Telemetry.telemetryName;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
    }

    public static sendErrorEvent(eventName: string,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; },
        errorProps?: string[]) {
        if (!properties) {
            properties = {};
        }
        properties[Telemetry.component] = Telemetry.telemetryName;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
    }

    public static sendException(error: Error,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; }) {
        if (!properties) {
            properties = {};
        }
        properties[Telemetry.component] = Telemetry.telemetryName;
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryException(error, properties, measurements);
    }
}