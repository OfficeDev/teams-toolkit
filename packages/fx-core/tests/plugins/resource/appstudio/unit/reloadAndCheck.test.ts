// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioError } from "./../../../../../src/plugins/resource/appstudio/errors";
import fs from "fs-extra";
import sinon from "sinon";

describe("Reload Manifest and Check Required Fields", () => {
  let plugin: AppStudioPlugin;
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("found no manifest and should return error", async () => {
    const reloadAndCheckResult = await plugin.reloadManifestAndCheckRequiredFields("notExist");
    chai.assert.isTrue(reloadAndCheckResult.isErr());
    if (reloadAndCheckResult.isErr()) {
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.ManifestLoadFailedError.name);
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().message)
        .includes("Failed to load manifest file from notExist/.fx/manifest.source.json");
    }
  });

  it("read an empty manifest and should return error", async () => {
    sandbox.stub<any, any>(fs, "readJson").resolves(undefined);
    const reloadAndCheckResult = await plugin.reloadManifestAndCheckRequiredFields("empty");
    chai.assert.isTrue(reloadAndCheckResult.isErr());
    if (reloadAndCheckResult.isErr()) {
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.ManifestLoadFailedError.name);
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().message)
        .includes("Failed to load manifest file");
    }
  });

  it("read an invalid manifest and should return error", async () => {
    const invalidInputPath = "invalid/.fx/manifest.source.json";
    const invalidManifestPath = "tests/plugins/resource/appstudio/resources/invalid.manifest.json";
    const invalidManifest = fs.readJson(invalidManifestPath);

    sandbox.stub<any, any>(fs, "readJson").callsFake(async (file: string) => {
      if (invalidInputPath === file) return invalidManifest;
      return {};
    });

    const reloadAndCheckResult = await plugin.reloadManifestAndCheckRequiredFields("invalid");
    chai.assert.isTrue(reloadAndCheckResult.isErr());
    if (reloadAndCheckResult.isErr()) {
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.ManifestLoadFailedError.name);
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().message)
        .includes("Error: Name is missing.");
    }
  });

  it("read a valid manifest and should return Ok for happy path", async () => {
    // sandbox.stub(AppStudioPluginImpl.prototype, "reloadManifest" as any).withArgs("valid").returns(ok(fs.readJson(validManifestPath)));
    const validInputPath = "valid/.fx/manifest.source.json";
    const validManifestPath = "tests/plugins/resource/appstudio/resources/valid.manifest.json";
    const validManifest = fs.readJson(validManifestPath);

    sandbox.stub<any, any>(fs, "readJson").callsFake(async (file: string) => {
      if (validInputPath === file) return validManifest;
      return {};
    });

    const reloadAndCheckResult = await plugin.reloadManifestAndCheckRequiredFields("valid");
    chai.assert.isTrue(reloadAndCheckResult.isOk());
    if (reloadAndCheckResult.isOk()) {
      chai.assert.isNotEmpty(reloadAndCheckResult.value.name);
    }
  });
});
