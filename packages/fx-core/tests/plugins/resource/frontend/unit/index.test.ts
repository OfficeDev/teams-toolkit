// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import * as faker from "faker";
import * as sinon from "sinon";
import { FxError, PluginContext, Result } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import * as fetch from "../../../../../src/common/templatesUtils";

import { AzureStorageClient } from "../../../../../src/plugins/resource/frontend/clients";
import {
  NoBuildPathError,
  NoStorageError,
  StaticWebsiteDisabledError,
} from "../../../../../src/plugins/resource/frontend/resources/errors";
import {
  FrontendConfigInfo,
  FrontendPathInfo,
} from "../../../../../src/plugins/resource/frontend/constants";
import { FrontendPlugin } from "../../../../../src/plugins/resource/frontend/";
import { TestHelper } from "../helper";
import { Utils } from "../../../../../src/plugins/resource/frontend/utils";
import { getTemplatesFolder } from "../../../../../src";
import mock from "mock-fs";
import * as path from "path";

chai.use(chaiAsPromised);

describe("FrontendPlugin", () => {
  function assertError(result: Result<any, FxError>, errorName: string) {
    chai.assert.isTrue(result.isErr());
    result.mapErr((err) => {
      chai.assert.include(err.name, errorName);
    });
  }

  describe("scaffold", () => {
    let frontendPlugin: FrontendPlugin;
    let pluginContext: PluginContext;

    beforeEach(async () => {
      pluginContext = TestHelper.getFakePluginContext();
      frontendPlugin = new FrontendPlugin();
    });

    afterEach(() => {
      fs.emptyDirSync(pluginContext.root);
      fs.rmdirSync(pluginContext.root);
      sinon.restore();
    });

    before(() => {
      const config: any = {};
      config[
        path.join(
          getTemplatesFolder(),
          "plugins",
          "resource",
          FrontendPathInfo.TemplateFolderName,
          "tab.js.default.zip"
        )
      ] = new AdmZip().toBuffer();
      mock(config);
    });

    after(() => {
      mock.restore();
    });

    it("happy path", async () => {
      sinon.stub(fetch, "fetchTemplateUrl").resolves(faker.internet.url());
      sinon.stub(fetch, "fetchZipFromUrl").resolves(new AdmZip());

      const result = await frontendPlugin.scaffold(pluginContext);

      chai.assert.isTrue(result.isOk());
    });

    it("fallback", async () => {
      sinon.stub(fetch, "fetchTemplateUrl").rejects(new Error());

      const result = await frontendPlugin.scaffold(pluginContext);

      chai.assert.isTrue(result.isOk());
    });
  });

  describe("postProvision", () => {
    let frontendPlugin: FrontendPlugin;
    let pluginContext: PluginContext;

    beforeEach(async () => {
      pluginContext = TestHelper.getFakePluginContext();
      sinon
        .stub(AzureStorageClient.prototype, "enableStaticWebsite")
        .returns(Promise.resolve(undefined));
      pluginContext.config.set(FrontendConfigInfo.Endpoint, TestHelper.storageEndpoint);

      frontendPlugin = new FrontendPlugin();

      sinon.stub(fs, "pathExists").resolves(false);
      sinon.stub(fs, "readFile").resolves(Buffer.from(""));
      sinon.stub(fs, "writeFile").resolves();
      sinon.stub(fs, "ensureFile").resolves(Buffer.from(""));
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      // mock plugin context
      pluginContext.config.set(
        "storageResourceId",
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/fakerg/providers/Microsoft.Storage/storageAccounts/fakestorageaccount"
      );

      const result = await frontendPlugin.postProvision(pluginContext);

      chai.assert.isTrue(result.isOk());
    });
  });

  describe("preDeploy", () => {
    let frontendPlugin: FrontendPlugin;
    let pluginContext: PluginContext;

    let staticWebsiteEnabledStub: sinon.SinonStub;
    let storageExistsStub: sinon.SinonStub;

    beforeEach(async () => {
      frontendPlugin = new FrontendPlugin();
      pluginContext = TestHelper.getFakePluginContext();
      pluginContext.config.set(FrontendConfigInfo.StorageResourceId, TestHelper.storageResourceId);
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readFile").resolves(Buffer.from(""));
      sinon.stub(fs, "writeFile").resolves();
      sinon.stub(fs, "ensureFile").resolves(Buffer.from(""));

      staticWebsiteEnabledStub = sinon
        .stub(AzureStorageClient.prototype, "isStorageStaticWebsiteEnabled")
        .resolves(true);
      storageExistsStub = sinon
        .stub(AzureStorageClient.prototype, "doesStorageAccountExists")
        .resolves(true);
      sinon.stub(AzureStorageClient.prototype, "doesResourceGroupExists").resolves(true);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const result = await frontendPlugin.preDeploy(pluginContext);

      chai.assert.isTrue(result.isOk());
    });

    it("storage not found", async () => {
      storageExistsStub.resolves(false);

      const result = await frontendPlugin.preDeploy(pluginContext);

      assertError(result, new NoStorageError().code);
    });

    it("static website disabled", async () => {
      staticWebsiteEnabledStub.resolves(false);

      const result = await frontendPlugin.preDeploy(pluginContext);

      assertError(result, new StaticWebsiteDisabledError().code);
    });
  });

  describe("deploy", () => {
    let frontendPlugin: FrontendPlugin;
    let pluginContext: PluginContext;
    let fsPathExistsStub: sinon.SinonStub;

    beforeEach(async () => {
      frontendPlugin = new FrontendPlugin();
      pluginContext = TestHelper.getFakePluginContext();
      pluginContext.config.set(FrontendConfigInfo.StorageResourceId, TestHelper.storageResourceId);
      sinon.stub(AzureStorageClient.prototype, "getContainer").resolves({} as any);
      sinon.stub(AzureStorageClient.prototype, "deleteAllBlobs").resolves();
      sinon.stub(AzureStorageClient.prototype, "uploadFiles").resolves();
      sinon.stub(Utils, "execute").resolves();
      sinon.stub(fs, "ensureDir").resolves();
      sinon.stub(fs, "readJSON").resolves({});
      sinon.stub(fs, "writeJSON").resolves();
      fsPathExistsStub = sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readFile").resolves(Buffer.from(""));
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const result = await frontendPlugin.deploy(pluginContext);
      chai.assert.isTrue(result.isOk());
    });

    it("local path does not exists", async () => {
      fsPathExistsStub.resolves(false);

      const result = await frontendPlugin.deploy(pluginContext);

      assertError(result, new NoBuildPathError().code);
    });
  });
});
