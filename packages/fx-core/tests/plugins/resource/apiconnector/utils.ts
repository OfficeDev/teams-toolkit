import { TelemetryReporter } from "@microsoft/teamsfx-api";
import path from "path";
import { newEnvInfo } from "../../../../src";
import {
  BasicAuthConfig,
  AADAuthConfig,
  APIKeyAuthConfig,
} from "../../../../src/plugins/resource/apiconnector/config";
import { AuthType, KeyLocation } from "../../../../src/plugins/resource/apiconnector/constants";
import { DependentPluginInfo } from "../../../../src/plugins/resource/function/constants";

export function MockContext(): any {
  return {
    envInfo: newEnvInfo(
      undefined,
      undefined,
      new Map<string, Map<string, string>>([
        [
          DependentPluginInfo.solutionPluginName,
          new Map<string, string>([
            [DependentPluginInfo.resourceGroupName, "ut"],
            [DependentPluginInfo.subscriptionId, "ut"],
            [DependentPluginInfo.resourceNameSuffix, "ut"],
          ]),
        ],
      ])
    ),
    app: {
      name: {
        short: "ut",
      },
    },
    projectSetting: {
      appName: "ut",
      programmingLanguage: "javascript",
      solutionSettings: {
        activeResourcePlugins: ["fx-resource-bot", "fx-resource-function"],
      },
    },
    config: new Map(),
    root: path.join(__dirname, "ut"),
    telemetryReporter: mockTelemetryReporter,
  };
}

const mockTelemetryReporter: TelemetryReporter = {
  async sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log("Telemetry event");
    console.log(eventName);
    console.log(properties);
  },

  async sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log("Telemetry Error");
    console.log(eventName);
    console.log(properties);
  },

  async sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ) {
    console.log("Telemetry Exception");
    console.log(error.message);
    console.log(properties);
  },
};

export const SampleCodeCases = [
  {
    AuthConfig: {
      AuthType: AuthType.BASIC,
      UserName: "fake_api_user_name",
    } as BasicAuthConfig,
    FileName: "basic",
  },
  {
    AuthConfig: {
      AuthType: AuthType.AAD,
      ReuseTeamsApp: true,
    } as AADAuthConfig,
    FileName: "aad",
  },
  {
    AuthConfig: {
      AuthType: AuthType.AAD,
      ReuseTeamsApp: false,
      TenantId: "fake_tenant_id",
      ClientId: "fake_client_id",
    } as AADAuthConfig,
    FileName: "aad-existing-app",
  },
  {
    AuthConfig: {
      AuthType: AuthType.CUSTOM,
    },
    FileName: "custom",
  },
  {
    AuthConfig: {
      AuthType: AuthType.CERT,
    },
    FileName: "cert",
  },
  {
    AuthConfig: {
      AuthType: AuthType.APIKEY,
      Name: "fake_api_key_name",
      Location: KeyLocation.Header,
    } as APIKeyAuthConfig,
    FileName: "api-key",
  },
];
