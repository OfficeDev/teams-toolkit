import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { PluginContext } from "@microsoft/teamsfx-api";
import { ARM_TEMPLATE_OUTPUT, newEnvInfo } from "../../../../src";
import { Constants } from "../../../../src/plugins/resource/sql/constants";
import { MockUserInteraction } from "../../../core/utils";

export class TestHelper {
  static async pluginContext(
    credentials: msRestNodeAuth.TokenCredentialsBase
  ): Promise<PluginContext> {
    const pluginContext = {
      azureAccountProvider: {
        getAccountCredentialAsync() {
          return credentials;
        },
        getIdentityCredentialAsync() {
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
        async debug(message: string): Promise<boolean> {
          console.debug(message);
          return true;
        },
        async warning(message: string): Promise<boolean> {
          console.warn(message);
          return true;
        },
      },
      ui: new MockUserInteraction(),
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
            Constants.solution,
            new Map([
              [
                Constants.solutionConfigKey.resourceNameSuffix,
                Math.random().toString(36).substring(2, 8),
              ],
              [Constants.solutionConfigKey.subscriptionId, "1756abc0-3554-4341-8d6a-46674962ea19"],
              [Constants.solutionConfigKey.resourceGroupName, "zhaofengtest"],
              [Constants.solutionConfigKey.location, "eastus"],
            ]),
          ],
          [Constants.identityPlugin, new Map([[Constants.identityName, "zhaofeng-msi"]])],
        ])
      ),
      app: {
        name: {
          short: "hello-app",
        },
      },
      projectSettings: { appName: "hello-app" },
    } as unknown as PluginContext;

    return pluginContext;
  }

  static mockArmOutput(context: PluginContext) {
    const solutionProfile = context.envInfo.state.get("solution") ?? new Map();
    const armOutput = solutionProfile[ARM_TEMPLATE_OUTPUT] ?? {};
    armOutput["azureSqlOutput"] = {
      type: "Object",
      value: {
        teamsFxPluginId: "fx-resource-azure-sql",
        sqlResourceId:
          "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Sql/servers/test-sql",
        sqlEndpoint: "test-sql.database.windows.net",
        databaseName: "databaseName",
      },
    };
    solutionProfile.set(ARM_TEMPLATE_OUTPUT, armOutput);
    context.envInfo.state.set("solution", solutionProfile);
  }
}
