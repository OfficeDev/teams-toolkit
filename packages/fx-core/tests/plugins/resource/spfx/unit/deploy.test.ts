// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import sinon from "sinon";
import * as chai from "chai";
import axios from "axios";
import { SpfxPlugin } from "../../../../../src/plugins/resource/spfx";
import { SPFxPluginImpl } from "../../../../../src/plugins/resource/spfx/plugin";
import { ok, PluginContext } from "@microsoft/teamsfx-api";
import { TestHelper } from "../helper";
import { SPOClient } from "../../../../../src/plugins/resource/spfx/spoClient";

describe.skip("SPFxDeploy", function () {
  let plugin: SpfxPlugin;
  let pluginContext: PluginContext;
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    plugin = new SpfxPlugin();
    pluginContext = TestHelper.getFakePluginContext(
      "spfxdeploy1019",
      "./tests/plugins/resource/spfx/resources/",
      "none"
    );
    sandbox.stub(SPFxPluginImpl.prototype, "buildSPPackage" as any).returns(ok(undefined));
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("deploy successfully", async function () {
    sinon.stub(axios, "get").resolves({ status: 200, data: { webUrl: "TENANT_URL" } });
    const result = await plugin.postScaffold(pluginContext);
    chai.assert.isTrue(result.isOk());
  });

  it("deploy failed with insufficient permission", async function () {});

  it("create app catalog", async function () {});
});
