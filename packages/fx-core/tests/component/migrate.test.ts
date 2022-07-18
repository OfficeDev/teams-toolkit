// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import { assert } from "chai";
import {
  convertProjectSettingsV2ToV3,
  convertProjectSettingsV3ToV2,
} from "../../src/component/migrate";
describe("Migration test for v3", () => {
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
    const v3 = convertProjectSettingsV2ToV3(projectSettings);
    console.log(JSON.stringify(v3, undefined, 4));
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
      ],
      programmingLanguage: "javascript",
    };
    const v2 = convertProjectSettingsV3ToV2(projectSettings);
    assert.isTrue(v2.solutionSettings !== undefined);
  });
});
