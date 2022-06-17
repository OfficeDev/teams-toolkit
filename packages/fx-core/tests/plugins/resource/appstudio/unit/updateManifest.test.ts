// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import * as fs from "fs-extra";
import { GLOBAL_CONFIG, newEnvInfo, SOLUTION_PROVISION_SUCCEEDED } from "../../../../../src";
import { ConfigMap, PluginContext } from "@microsoft/teamsfx-api";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { AppStudioPluginImpl } from "../../../../../src/plugins/resource/appstudio/plugin";
import { mockTokenProviderM365 } from "../../aad/helper";

describe("Update manifest preview file", () => {
  let plugin: AppStudioPluginImpl;
  let ctx: PluginContext;

  beforeEach(async () => {
    sinon.restore();
    const buildFolder = "../fx-core/tests/plugins/resource/appstudio/resources-multi-env/build";
    if (await fs.pathExists(buildFolder)) {
      await fs.remove(buildFolder);
    }
    plugin = new AppStudioPluginImpl();
    ctx = {
      root: "../fx-core/tests/plugins/resource/appstudio/resources-multi-env",
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      cryptoProvider: new LocalCrypto(""),
      m365TokenProvider: mockTokenProviderM365(),
    };
    ctx.projectSettings = {
      appName: "my app",
      projectId: "testid",
      solutionSettings: {
        name: "spfx",
        version: "1.0",
        capabilities: ["tab"],
        activeResourcePlugins: ["fx-resource-spfx"],
      },
    };
    ctx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
  });

  it("Generate manifest first if already provisioned", async () => {
    const buildTeamsPackage = sinon.stub(plugin, "buildTeamsAppPackage");

    try {
      await plugin.updateManifest(ctx, false);
    } catch (e) {}
    chai.expect(buildTeamsPackage.calledOnce).to.be.true;
    sinon.restore();
  });
});
