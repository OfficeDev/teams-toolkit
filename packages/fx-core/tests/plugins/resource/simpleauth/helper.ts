// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import faker from "faker";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { Constants } from "../../../../src/plugins/resource/simpleauth/constants";
import { ScaffoldArmTemplateResult } from "../../../../src/common/armInterface";
import { compileHandlebarsTemplateString } from "../../../../src";

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
      dialog: {
        createProgressBar(title: string, totalSteps: number) {
          console.log(`Create ProgressBar, title: ${title}, totalSteps: ${totalSteps}`);
          return {
            start: (detail?: string) => {
              console.log("start detail: " + detail);
            },
            next: (detail?: string) => {
              console.log("next detail: " + detail);
            },
            end: () => {
              console.log("ProgressBar end");
            },
          };
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
      configOfOtherPlugins: new Map([
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
              Constants.AadAppPlugin.configKeys.teamsMobileDesktopAppId,
              "mock-teamsMobileDesktopAppId",
            ],
            [Constants.AadAppPlugin.configKeys.teamsWebAppId, "mock-teamsWebAppId"],
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
      ]),
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
    } as unknown as PluginContext;

    return pluginContext;
  }

  static mockSolutionUpdateArmTemplates(
    mockedData: any,
    template: ScaffoldArmTemplateResult
  ): ScaffoldArmTemplateResult {
    return {
      Modules: template.Modules,
      Orchestration: {
        ParameterTemplate: {
          Content: compileHandlebarsTemplateString(
            template.Orchestration.ParameterTemplate!.Content,
            mockedData
          ),
        },
        ModuleTemplate: {
          Content: compileHandlebarsTemplateString(
            template.Orchestration.ModuleTemplate.Content,
            mockedData
          ),
          Outputs: template.Orchestration.ModuleTemplate.Outputs,
        },
        OutputTemplate: {
          Content: compileHandlebarsTemplateString(
            template.Orchestration.OutputTemplate!.Content,
            mockedData
          ),
        },
      },
    } as ScaffoldArmTemplateResult;
  }
}
