// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import { assert } from "chai";
import {
  convertEnvStateMapV3ToV2,
  convertProjectSettingsV2ToV3,
  convertProjectSettingsV3ToV2,
} from "../../src/component/migrate";
import { InputsWithProjectPath, Platform, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as os from "os";
import { generateBicepsV3 } from "../../src/core/middleware/projectMigrator";
import mockedEnv, { RestoreFn } from "mocked-env";
describe("Migration test for v3", () => {
  let mockedEnvRestore: RestoreFn;
  it("convertProjectSettingsV2ToV3", async () => {
    const projectSettings = {
      appName: "hj070701",
      projectId: "112233",
      version: "2.1.0",
      isFromSample: false,
      solutionSettings: {
        name: "fx-solution-azure",
        version: "1.0.0",
        hostType: "Azure",
        azureResources: ["function", "apim", "sql", "keyvault"],
        capabilities: ["Bot", "Tab", "TabSSO", "MessagingExtension"],
        activeResourcePlugins: [
          "fx-resource-frontend-hosting",
          "fx-resource-identity",
          "fx-resource-azure-sql",
          "fx-resource-bot",
          "fx-resource-aad-app-for-teams",
          "fx-resource-function",
          "fx-resource-local-debug",
          "fx-resource-apim",
          "fx-resource-appstudio",
          "fx-resource-key-vault",
          "fx-resource-cicd",
          "fx-resource-api-connector",
        ],
      },
      programmingLanguage: "javascript",
      pluginSettings: {
        "fx-resource-bot": {
          "host-type": "azure-functions",
          capabilities: ["notification"],
        },
      },
      defaultFunctionName: "getUserProfile",
    };
    const v3 = convertProjectSettingsV2ToV3(projectSettings, ".");
    assert.isTrue(v3.components.length > 0);
  });
  it("convertProjectSettingsV3ToV2", async () => {
    const projectSettings = {
      appName: "hj070701",
      projectId: "112233",
      version: "2.1.0",
      isFromSample: false,
      components: [
        {
          name: "teams-bot",
          hosting: "azure-function",
          capabilities: ["notification"],
          build: true,
          folder: "bot",
        },
        {
          name: "azure-function",
          connections: ["teams-bot"],
        },
        {
          name: "bot-service",
          provision: true,
        },
        {
          name: "teams-tab",
          hosting: "azure-storage",
          build: true,
          provision: true,
          folder: "tabs",
          connections: ["teams-api"],
        },
        {
          name: "azure-storage",
          connections: ["teams-tab"],
          provision: true,
        },
        {
          name: "apim",
          provision: true,
          deploy: true,
          connections: ["teams-tab", "teams-bot"],
        },
        {
          name: "teams-api",
          hosting: "azure-function",
          functionNames: ["getUserProfile"],
          build: true,
          folder: "api",
        },
        {
          name: "azure-function",
          connections: ["teams-api"],
        },
        {
          name: "simple-auth",
        },
        {
          name: "key-vault",
        },
      ],
      programmingLanguage: "javascript",
    };
    const v2 = convertProjectSettingsV3ToV2(projectSettings);
    assert.isTrue(v2.solutionSettings !== undefined);
  });

  it("convertEnvStateMapV3ToV2", async () => {
    const envStateMap = new Map<string, any>();
    envStateMap.set("app-manifest", new Map<string, any>());
    const res = convertEnvStateMapV3ToV2(envStateMap);
    assert.isTrue(res.has("fx-resource-appstudio"));
  });

  it("generateBicepV3", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const settings: ProjectSettingsV3 = {
      appName: "testapp123",
      projectId: "b46390fc-8cff-4842-8ade-56d82c531c68",
      solutionSettings: {
        name: "fx-solution-azure",
        version: "1.0.0",
        hostType: "Azure",
        azureResources: ["sql", "function"],
        capabilities: ["Tab", "TabSSO", "MessagingExtension"],
        activeResourcePlugins: [
          "fx-resource-local-debug",
          "fx-resource-appstudio",
          "fx-resource-cicd",
          "fx-resource-api-connector",
          "fx-resource-aad-app-for-teams",
          "fx-resource-frontend-hosting",
          "fx-resource-bot",
          "fx-resource-identity",
          "fx-resource-simple-auth",
          "fx-resource-azure-sql",
          "fx-resource-function",
        ],
      },
      programmingLanguage: "javascript",
      defaultFunctionName: "getUserProfile",
      version: "2.0.0",
      components: [
        {
          name: "aad-app",
          provision: true,
          deploy: true,
        },
        {
          hosting: "azure-storage",
          name: "teams-tab",
          build: true,
          provision: true,
          folder: "tabs",
          sso: true,
          deploy: true,
        },
        {
          name: "azure-storage",
          connections: ["teams-tab"],
          provision: true,
        },
        {
          hosting: "azure-web-app",
          name: "teams-bot",
          build: true,
          provision: true,
          folder: "bot",
          capabilities: ["message-extension"],
          sso: false,
          deploy: true,
        },
        {
          name: "azure-web-app",
          connections: ["identity", "azure-sql", "aad-app", "teams-tab", "teams-bot", "teams-api"],
          provision: true,
          scenario: "Bot",
        },
        {
          name: "bot-service",
          provision: true,
        },
        {
          name: "identity",
        },
        {
          name: "azure-sql",
          provision: true,
        },
        {
          name: "simple-auth",
          provision: true,
        },
        {
          name: "apim",
          provision: true,
        },
        {
          name: "key-vault",
          provision: true,
        },
        {
          name: "teams-api",
          hosting: "azure-function",
          functionNames: ["getUserProfile"],
          build: true,
          folder: "api",
          deploy: true,
          artifactFolder: "api",
        },
        {
          name: "azure-function",
          scenario: "Api",
          connections: ["identity", "azure-sql", "aad-app", "teams-tab", "teams-bot", "teams-api"],
        },
      ],
      pluginSettings: {
        "fx-resource-bot": {
          "host-type": "app-service",
          capabilities: ["message-extension"],
        },
      },
    };
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: path.join(os.homedir(), "TeamsApps", "testapp123"),
    };
    const res = generateBicepsV3(settings, inputs);
    assert.isTrue((await res).isOk());
    mockedEnvRestore();
  });
});
