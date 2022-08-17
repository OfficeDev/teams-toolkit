// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";
import { SpfxPlugin } from "../../../../../src/plugins/resource/spfx";
import * as sinon from "sinon";
import { Utils } from "../../../../../src/plugins/resource/spfx/utils/utils";
import { TestHelper } from "../helper";
import { YoChecker } from "../../../../../src/plugins/resource/spfx/depsChecker/yoChecker";
import { GeneratorChecker } from "../../../../../src/plugins/resource/spfx/depsChecker/generatorChecker";
import { cpUtils } from "../../../../../src/plugins/solution/fx-solution/utils/depsChecker/cpUtils";
import * as uuid from "uuid";
import { ok, Void } from "@microsoft/teamsfx-api";
import { DefaultManifestProvider } from "../../../../../src/component/resource/appManifest/manifestProvider";
import mockedEnv from "mocked-env";

describe("SPFxScaffold", function () {
  const testFolder = path.resolve("./tmp");
  const appName = "spfxApp";
  let plugin: SpfxPlugin;

  beforeEach(async () => {
    plugin = new SpfxPlugin();
    await fs.ensureDir(testFolder);
    sinon.stub(Utils, "configure");
    sinon.stub(fs, "stat").resolves();
    sinon.stub(YoChecker.prototype, "isInstalled").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    const manifestId = uuid.v4();
    sinon.stub(fs, "readFile").resolves(new Buffer(`{"id": "${manifestId}"}`));
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(fs, "rename").resolves();
    sinon.stub(fs, "copyFile").resolves();
    sinon.stub(fs, "remove").resolves();
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readJson").resolves({});
    sinon.stub(DefaultManifestProvider.prototype, "updateCapability").resolves(ok(Void));
  });

  it("scaffold SPFx project without framework", async function () {
    const pluginContext = TestHelper.getFakePluginContext(appName, testFolder, "none");
    const result = await plugin.postScaffold(pluginContext);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with react framework", async function () {
    const pluginContext = TestHelper.getFakePluginContext(appName, testFolder, "react");
    const result = await plugin.postScaffold(pluginContext);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with minimal framework", async function () {
    const pluginContext = TestHelper.getFakePluginContext(appName, testFolder, "minimal");
    const result = await plugin.postScaffold(pluginContext);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with extremely long webpart name", async function () {
    const pluginContext = TestHelper.getFakePluginContext(
      appName,
      testFolder,
      "react",
      "extremelylongextremelylongextremelylongextremelylongspfxwebpartname"
    );
    const result = await plugin.postScaffold(pluginContext);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
  });

  it("add webpart to SPFx project framework", async function () {
    const mockedEnvRestore = mockedEnv({ TEAMSFX_SPFX_MULTI_TAB: "true" });
    const fakedAddCapability = sinon
      .stub(DefaultManifestProvider.prototype, "addCapabilities")
      .resolves(ok(Void));
    const pluginContext = TestHelper.getFakePluginContext(appName, testFolder, undefined);
    const result = await plugin.postScaffold(pluginContext);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
    expect(fakedAddCapability.calledOnce).to.eq(true);
    mockedEnvRestore();
  });

  afterEach(async () => {
    sinon.restore();
    await fs.remove(testFolder);
  });
});
