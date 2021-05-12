import { PluginContext } from "fx-api";
import { Telemetry } from "../constants";

export class TelemetryUtils {
    static ctx: PluginContext;

    public static init(ctx: PluginContext) {
        TelemetryUtils.ctx = ctx;
    }

    private static send(eventName: string,
        properties: { [key: string]: string; },
        measurements?: { [key: string]: number; }) {
        properties[Telemetry.properties.component] = Telemetry.componentName;
        if (this.ctx.app.id) {
            properties[Telemetry.properties.appid] = this.ctx.app.id;
        }
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
    }

    public static sendEvent(eventName: string,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; }) {
        if (!properties) {
            properties = {};
        }
        TelemetryUtils.send(eventName, properties, measurements);
    }

    public static sendSuccessEvent(eventName: string,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; }) {
        if (!properties) {
            properties = {};
        }
        properties[Telemetry.properties.success] = Telemetry.resultYes;
        TelemetryUtils.send(eventName, properties, measurements);
    }

    public static sendErrorEvent(eventName: string,
        errorCode: string,
        errorType: string,
        errorMessage: string,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; }) {
        if (!properties) {
            properties = {};
        }
        properties[Telemetry.properties.success] = Telemetry.resultNo;
        properties[Telemetry.properties.errorCode] = errorCode;
        properties[Telemetry.properties.errorType] = errorType;
        properties[Telemetry.properties.errorMessage] = errorMessage;
        properties[Telemetry.properties.component] = Telemetry.componentName;
        if (this.ctx.app.id) {
            properties[Telemetry.properties.appid] = this.ctx.app.id;
        }
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements);
    }
}