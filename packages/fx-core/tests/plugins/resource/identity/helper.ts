import { PluginContext } from "@microsoft/teamsfx-api";
import { newEnvInfo } from "../../../../src";
import { Constants } from "../../../../src/plugins/resource/identity/constants";
import { MyTokenCredential } from "../bot/unit/utils";

export class TestHelper {
  static async pluginContext(): Promise<PluginContext> {
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
        async debug(message: string): Promise<boolean> {
          console.debug(message);
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
            Constants.solution,
            new Map([
              [Constants.resourceNameSuffix, Math.random().toString(36).substring(2, 8)],
              [Constants.subscriptionId, "1756abc0-3554-4341-8d6a-46674962ea19"],
              [Constants.resourceGroupName, "zhaofengtest"],
              [Constants.location, "eastus"],
            ]),
          ],
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
}
