// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import { assert } from "chai";
import { convertProjectSettingsV2ToV3 } from "../../src/component/migrate";
describe("Migration test for v3", () => {
  it("convertProjectSettingsV2ToV3", async () => {
    const projectSettings = {
      appName: "hj070701",
      projectId: "22ce7500-713f-4c74-8736-cd0811563dc6",
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
        },
      },
      defaultFunctionName: "getUserProfile",
    };
    const v3 = convertProjectSettingsV2ToV3(projectSettings);
    console.log(JSON.stringify(v3, undefined, 4));
    assert.isTrue(v3.components.length > 0);
  });
});
