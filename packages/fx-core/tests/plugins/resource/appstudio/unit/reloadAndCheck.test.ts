// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { ConfigMap, PluginContext, TeamsAppManifest, ok } from "@microsoft/teamsfx-api";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioError } from "./../../../../../src/plugins/resource/appstudio/errors";

describe("Reload Manifest and Check Required Fields", () => {
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: "./",
      configOfOtherPlugins: new Map(),
      config: new ConfigMap(),
      app: new TeamsAppManifest(),
    };
  });

  it("No manifest", async () => {
    const reloadAndCheckResult = await plugin.reloadManifestAndCheckRequiredFields(".");
    chai.assert.isTrue(reloadAndCheckResult.isErr());
    if (reloadAndCheckResult.isErr()) {
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.ManifestLoadFailedError.name);
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().message)
        .equals(AppStudioError.ManifestLoadFailedError.message);
    }
  });

  it("Invalid manifest", async () => {
    const reloadAndCheckResult = await plugin.reloadManifestAndCheckRequiredFields(
      "./invalidCheck"
    );
    chai.assert.isTrue(reloadAndCheckResult.isErr());
    if (reloadAndCheckResult.isErr()) {
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().name)
        .equals(AppStudioError.ManifestLoadFailedError.name);
      chai
        .expect(reloadAndCheckResult._unsafeUnwrapErr().message)
        .equals(AppStudioError.ManifestLoadFailedError.message);
    }
  });

  it("Valid manifest", async () => {
    const reloadAndCheckResult = await plugin.reloadManifestAndCheckRequiredFields("./validCheck");
    chai.assert.isTrue(reloadAndCheckResult.isOk());
    if (reloadAndCheckResult.isOk()) {
      chai.assert.isNotEmpty(reloadAndCheckResult.value.name);
    }
  });
});
