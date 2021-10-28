// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigMap, LocalSettings, PluginContext } from "@microsoft/teamsfx-api";
import faker from "faker";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { Constants } from "../../../../src/plugins/resource/simpleauth/constants";
import { newEnvInfo } from "../../../../src/core/tools";
import { ARM_TEMPLATE_OUTPUT, isMultiEnvEnabled } from "../../../../src";
import {
  LocalSettingsAuthKeys,
  LocalSettingsFrontendKeys,
} from "../../../../src/common/localSettingsConstants";
import { SOLUTION } from "../../../../src/plugins/resource/appstudio/constants";
import { ConfigKeysOfOtherPlugin } from "../../../../src/plugins/resource/aad/constants";

export class TestHelper {
  static async pluginContext(
    credentials: msRestNodeAuth.TokenCredentialsBase
  ): Promise<PluginContext> {
    const mockEndpoint = "https://endpoint.mock";
    const pluginContext = {
      azureAccountProvider: {
        getAccountCredentialAsync() {
          return credentials;
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
      localSettings: isMultiEnvEnabled()
        ? ({
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
          } as LocalSettings)
        : undefined,
    } as unknown as PluginContext;

    return pluginContext;
  }
}

export function mockArmOutput(context: PluginContext, simpleAuthUrl: string) {
  // set context.envInfo.state.get(SOLUTION)[ARM_TEMPLATE_OUTPUT]["domain"] = some fake value
  const solutionProfile = context.envInfo.state.get(SOLUTION) ?? new Map();
  const armOutput = solutionProfile[ARM_TEMPLATE_OUTPUT] ?? {};

  armOutput["frontendHostingOutput"] = {
    type: "Object",
    value: {
      teamsFxPluginId: "fx-resource-frontend-hosting",
      storageResourceId: `/subscriptions/test_subscription_id/resourceGroups/test_resource_group_name/providers/Microsoft.Storage/storageAccounts/test_storage_name`,
      endpoint: `https://test_storage_name.z13.web.core.windows.net`,
      domain: `test_storage_name.z13.web.core.windows.net`,
    },
  };
  armOutput[Constants.ArmOutput.simpleAuthEndpoint] = {
    type: "String",
    value: simpleAuthUrl,
  };

  solutionProfile.set(ARM_TEMPLATE_OUTPUT, armOutput);
  context.envInfo.state.set(SOLUTION, solutionProfile);
}
