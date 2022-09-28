// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigMap, LocalSettings, PluginContext } from "@microsoft/teamsfx-api";
import faker from "faker";
import { newEnvInfo } from "../../../../src/core/environment";
import {
  LocalSettingsAuthKeys,
  LocalSettingsFrontendKeys,
} from "../../../../src/common/localSettingsConstants";
import { Constants } from "../../../../src/component/resource/simpleAuth/constants";
import { MyTokenCredential } from "../../solution/util";
export class TestHelper {
  static async pluginContext(): Promise<PluginContext> {
    const mockEndpoint = "https://endpoint.mock";
    const pluginContext = {
      azureAccountProvider: {
        getIdentityCredentialAsync() {
          return new MyTokenCredential();
        },
        getSelectedSubscription: async () => {
          return {
            subscriptionId: "subscriptionId",
            tenantId: "tenantId",
            subscriptionName: "subscriptionName",
          };
        },
      },
      logProvider: {
        async info(message: string): Promise<boolean> {
          console.info(message);
          return true;
        },
        async error(message: string): Promise<boolean> {
          console.error(message);
          return true;
        },
      },
      telemetryReporter: {
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
          console.log(error.name);
          console.log(error.message);
          console.log(properties);
        },
      },
      config: new Map(),
      envInfo: newEnvInfo(
        undefined,
        undefined,
        new Map([
          [
            Constants.SolutionPlugin.id,
            new Map([
              [
                Constants.SolutionPlugin.configKeys.resourceNameSuffix,
                Math.random().toString(36).substring(2, 8),
              ],
              [
                Constants.SolutionPlugin.configKeys.subscriptionId,
                "1756abc0-3554-4341-8d6a-46674962ea19",
              ],
              [Constants.SolutionPlugin.configKeys.resourceGroupName, "junhanTest0118"],
              [Constants.SolutionPlugin.configKeys.location, "eastus"],
              [Constants.SolutionPlugin.configKeys.remoteTeamsAppId, faker.datatype.uuid()],
            ]),
          ],
          [
            Constants.AadAppPlugin.id,
            new Map([
              [Constants.AadAppPlugin.configKeys.clientId, "mock-clientId"],
              [Constants.AadAppPlugin.configKeys.clientSecret, "mock-clientSecret"],
              [Constants.AadAppPlugin.configKeys.applicationIdUris, "mock-applicationIdUris"],
              [
                Constants.AadAppPlugin.configKeys.oauthAuthority,
                "https://login.microsoftonline.com/mock-teamsAppTenantId",
              ],
              [
                Constants.LocalPrefix + Constants.AadAppPlugin.configKeys.clientId,
                "mock-local-clientId",
              ],
              [
                Constants.LocalPrefix + Constants.AadAppPlugin.configKeys.clientSecret,
                "mock-local-clientSecret",
              ],
              [
                Constants.LocalPrefix + Constants.AadAppPlugin.configKeys.applicationIdUris,
                "mock-local-applicationIdUris",
              ],
            ]),
          ],
          [
            Constants.FrontendPlugin.id,
            new Map([[Constants.FrontendPlugin.configKeys.endpoint, mockEndpoint]]),
          ],
          [
            Constants.LocalDebugPlugin.id,
            new Map([[Constants.LocalDebugPlugin.configKeys.endpoint, mockEndpoint]]),
          ],
          [Constants.SimpleAuthPlugin.id, new Map([])],
        ])
      ),
      app: {
        name: {
          short: "hello-app",
        },
      },
      projectSettings: {
        appName: "hello-app",
        solutionSettings: {
          activeResourcePlugins: [
            Constants.AadAppPlugin.id,
            Constants.FrontendPlugin.id,
            Constants.SimpleAuthPlugin.id,
          ],
        },
      },
      localSettings: {
        teamsApp: new ConfigMap(),
        auth: new ConfigMap([
          [LocalSettingsAuthKeys.ClientId, "mock-local-clientId"],
          [LocalSettingsAuthKeys.ClientSecret, "mock-local-clientSecret"],
          [
            LocalSettingsAuthKeys.OauthAuthority,
            "https://login.microsoftonline.com/mock-teamsAppTenantId",
          ],
          [LocalSettingsAuthKeys.ApplicationIdUris, "mock-local-applicationIdUris"],
        ]),
        frontend: new ConfigMap([[LocalSettingsFrontendKeys.TabEndpoint, mockEndpoint]]),
      } as LocalSettings,
    } as unknown as PluginContext;

    return pluginContext;
  }
}

export function mockArmOutput(context: PluginContext, simpleAuthUrl: string) {
  // solution plugin will now help fill plugin context
  const frontendHostingPluginId = "fx-resource-frontend-hosting";

  context.envInfo.state.set(
    frontendHostingPluginId,
    new Map<string, string>([
      [
        "storageResourceId",
        `/subscriptions/test_subscription_id/resourceGroups/test_resource_group_name/providers/Microsoft.Storage/storageAccounts/test_storage_name`,
      ],
      ["endpoint", `https://test_storage_name.z13.web.core.windows.net`],
      ["domain", `test_storage_name.z13.web.core.windows.net`],
    ])
  );

  context.config.set("skuName", "B1");
  context.config.set("endpoint", simpleAuthUrl);
  context.config.set("webAppName", "test_simple_auth_web_app_name");
  context.config.set("appServicePlanName", "test_simple_auth_app_service_plan_name");
}
