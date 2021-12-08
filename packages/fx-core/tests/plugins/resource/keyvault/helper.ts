// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import faker from "faker";
import * as uuid from "uuid";
import { Constants } from "../../../../src/plugins/resource/keyvault/constants";
import { newEnvInfo } from "../../../../src/core/tools";

export class TestHelper {
  static async pluginContext(): Promise<PluginContext> {
    const pluginContext = {
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
              [Constants.SolutionPlugin.configKeys.remoteTeamsAppId, faker.datatype.uuid()],
            ]),
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
        projectId: uuid.v4(),
        solutionSettings: {
          name: "test_solution",
          version: "1.0.0",
          activeResourcePlugins: [Constants.KeyVaultPlugin.pluginName],
        },
      },
    } as unknown as PluginContext;

    return pluginContext;
  }
}
