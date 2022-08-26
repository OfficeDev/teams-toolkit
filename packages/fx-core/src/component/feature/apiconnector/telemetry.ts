import { TelemetryReporter } from "@microsoft/teamsfx-api";
import { globalVars } from "../../../core";

export class Telemetry {
  static readonly componentName = "fx-resource-api-connector";
  static startSuffix = "-start";
  static valueYes = "yes";
  static valueNo = "no";
  static userError = "user";
  static systemError = "system";

  static readonly stage = {
    questionModel: "question-model",
    scaffold: "scaffold",
    updatePkg: "update-package",
  };

  static readonly properties = {
    component: "component",
    success: "success",
    errorCode: "error-code",
    errorType: "error-type",
    errorMessage: "error-message",
    appid: "appid",
    authType: "auth-type",
    reuseTeamsApp: "reuse-teams-app",
    keyLocation: "key-location",
    componentType: "component-type",
  };
}

export class TelemetryUtils {
  static telemetryReporter?: TelemetryReporter;

  public static init(telemetryReporter?: TelemetryReporter) {
    TelemetryUtils.telemetryReporter = telemetryReporter;
  }

  public static sendEvent(
    eventName: string,
    success?: boolean,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    if (!properties) {
      properties = {};
    }
    if (success) {
      properties[Telemetry.properties.success] = Telemetry.valueYes;
    }
    this.addProperties(properties);
    TelemetryUtils.telemetryReporter?.sendTelemetryEvent(eventName, properties, measurements);
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
    properties[Telemetry.properties.success] = Telemetry.valueNo;
    properties[Telemetry.properties.errorCode] = errorCode;
    properties[Telemetry.properties.errorType] = errorType;
    properties[Telemetry.properties.errorMessage] = errorMessage;
    this.addProperties(properties);
    TelemetryUtils.telemetryReporter?.sendTelemetryErrorEvent(eventName, properties, measurements);
  }

  private static addProperties(properties: { [key: string]: string }) {
    properties[Telemetry.properties.component] = Telemetry.componentName;
    const appId = globalVars.teamsAppId;
    if (appId) {
      properties[Telemetry.properties.appid] = appId as string;
    } else {
      properties[Telemetry.properties.appid] = "";
    }
  }
}
