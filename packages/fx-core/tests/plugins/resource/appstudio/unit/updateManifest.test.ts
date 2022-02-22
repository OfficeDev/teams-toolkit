// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { GLOBAL_CONFIG, newEnvInfo, SOLUTION_PROVISION_SUCCEEDED } from "../../../../../src";
import { ConfigMap, PluginContext, TeamsAppManifest } from "@microsoft/teamsfx-api";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { AppStudioPluginImpl } from "../../../../../src/plugins/resource/appstudio/plugin";

describe("Update manifest preview file", () => {
  let plugin: AppStudioPluginImpl;
  let ctx: PluginContext;
  let manifest: TeamsAppManifest;

  beforeEach(async () => {
    sinon.restore();
    plugin = new AppStudioPluginImpl();
    ctx = {
      root: "../fx-core/tests/plugins/resource/appstudio/resources-multi-env",
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: "testid",
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
        activeResourcePlugins: ["fx-resource-spfx"],
      },
    };
    ctx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    manifest = new TeamsAppManifest();
  });

  it("Generate manifest first if already provisioned", async () => {
    const buildTeamsPackage = sinon.stub(plugin, "buildTeamsAppPackage");

    try {
      await plugin.updateManifest(ctx, false);
    } catch (e) {}
    chai.assert(buildTeamsPackage.calledOnce);
  });
});
