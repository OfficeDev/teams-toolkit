import { PluginContext } from "@microsoft/teamsfx-api";
import { Telemetry } from "../constants";

export class TelemetryUtils {
    static ctx: PluginContext;

    public static init(ctx: PluginContext) {
        TelemetryUtils.ctx = ctx;
    }

    public static sendEvent(eventName: string,
        success?: boolean,
        properties?: { [key: string]: string; },
        measurements?: { [key: string]: number; }) {
        if (!properties) {
            properties = {};
        }
        if (success) {
            properties[Telemetry.properties.success] = Telemetry.resultYes;
        }
        properties[Telemetry.properties.component] = Telemetry.componentName;
        if (this.ctx.app.id) {
            properties[Telemetry.properties.appid] = this.ctx.app.id;
        }
        TelemetryUtils.ctx.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
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