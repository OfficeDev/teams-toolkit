import { TelemetryReporter } from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../../../src/component/constants";
import {
  BasicAuthConfig,
  AADAuthConfig,
  APIKeyAuthConfig,
} from "../../../../src/component/feature/apiconnector/config";
import { AuthType, KeyLocation } from "../../../../src/component/feature/apiconnector/constants";
import { DependentPluginInfo } from "../../../../src/plugins/resource/function/constants";
import { MockUserInteraction } from "../../../core/utils";

export function MockContext(): any {
  return {
    envInfo: {
      envName: "dev",
      state: {
        solution: {
          [DependentPluginInfo.resourceGroupName]: "ut",
          [DependentPluginInfo.subscriptionId]: "ut",
          [DependentPluginInfo.resourceNameSuffix]: "ut",
        },
      },
      config: {
        manifest: {
          appName: {
            short: "teamsfx_app",
          },
          description: {
            short: `Short description of teamsfx_app`,
            full: `Full description of teamsfx_app`,
          },
          icons: {
            color: "resources/color.png",
            outline: "resources/outline.png",
          },
        },
      },
    },
    projectSetting: {
      appName: "ut",
      programmingLanguage: "javascript",
      projectId: "projectId",
      components: [{ name: ComponentNames.TeamsBot }, { name: ComponentNames.TeamsApi }],
    },

    telemetryReporter: mockTelemetryReporter,
    userInteraction: new MockUserInteraction(),
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
