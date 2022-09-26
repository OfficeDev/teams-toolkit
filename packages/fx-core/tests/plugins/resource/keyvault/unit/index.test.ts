// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import { InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import { KeyVaultResource } from "../../../../../src/component/resource/keyVault";
import { createContextV3, newProjectSettingsV3 } from "../../../../../src/component/utils";

chai.use(chaiAsPromised);

describe("keyVaultPlugin", () => {
  let keyVaultPlugin: KeyVaultResource;
  beforeEach(async () => {
    keyVaultPlugin = new KeyVaultResource();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("generate arm templates", async function () {
    // Act
    const projectSettings = newProjectSettingsV3();
    projectSettings.programmingLanguage = "javascript";
    const context = createContextV3(projectSettings);
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const generateArmTemplatesResult = await keyVaultPlugin.generateBicep(context, inputs);
    chai.assert.isTrue(
      generateArmTemplatesResult.isOk() && generateArmTemplatesResult.value.length > 0
    );
  });
});
