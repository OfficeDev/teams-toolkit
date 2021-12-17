// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as dotenv from "dotenv";
import { AadAppForTeamsPlugin } from "../../../../../src/plugins/resource/aad/index";
import { AzureSolutionSettings, PluginContext } from "@microsoft/teamsfx-api";
import { TestHelper } from "../helper";
import { fileEncoding, PluginId, TestFilePath } from "../../../../constants";
import path from "path";
import { ArmTemplateResult } from "../../../../../src/common/armInterface";
import fs from "fs-extra";

dotenv.config();

describe("AadGenerateArmTemplates", () => {
  let aadPlugin: AadAppForTeamsPlugin;

  beforeEach(async () => {
    aadPlugin = new AadAppForTeamsPlugin();
  });

  it("should generate arm templates successfully", async function () {
    // Arrange
    const activeResourcePlugins = [
      PluginId.Aad,
      PluginId.SimpleAuth,
      PluginId.FrontendHosting,
      PluginId.Identity,
    ];
    const pluginContext: PluginContext = await TestHelper.pluginContext(new Map(), true, false);
    pluginContext.projectSettings!.solutionSettings = {
      activeResourcePlugins: activeResourcePlugins,
    } as AzureSolutionSettings;

    // Act
    const result = await aadPlugin.generateArmTemplates(pluginContext);

    // Assert
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      const armTemplateResult = result.value as ArmTemplateResult;
      chai.assert.strictEqual(
        JSON.stringify(armTemplateResult.Parameters, undefined, 2),
        await fs.readFile(
          path.join(
            __dirname,
            TestFilePath.expectedBicepFileFolder,
            TestFilePath.resultParameterFileName
          ),
          fileEncoding
        )
      );
      chai.assert.isUndefined(armTemplateResult.Configuration);
      chai.assert.isUndefined(armTemplateResult.Provision);
    }
  });
});
