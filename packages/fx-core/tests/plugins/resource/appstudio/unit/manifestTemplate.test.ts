// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, v2 } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import "mocha";
import "reflect-metadata";
import sinon from "sinon";
import {
  loadManifest,
  saveManifest,
} from "../../../../../src/plugins/resource/appstudio/manifestTemplate";
import { getAzureProjectRoot } from "../helper";

describe("Load and Save manifest template", () => {
  const sandbox = sinon.createSandbox();
  let inputs: v2.InputsWithProjectPath;
  beforeEach(async () => {
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Load and Save manifest template file", async () => {
    const loadedManifestTemplate = await loadManifest(inputs.projectPath);
    chai.assert.isTrue(loadedManifestTemplate.isOk());
    if (loadedManifestTemplate.isOk()) {
      const saveManifestResult = await saveManifest(
        inputs.projectPath,
        loadedManifestTemplate.value
      );
      chai.assert.isTrue(saveManifestResult.isOk());
    }
  });
});
