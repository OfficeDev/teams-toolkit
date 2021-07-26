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

import { AzureStorageClient } from "../../../../../src/plugins/resource/frontend/clients";
import {
  CreateStorageAccountError,
  EnableStaticWebsiteError,
  InvalidStorageNameError,
  NoBuildPathError,
  NoResourceGroupError,
  NoStorageError,
  StaticWebsiteDisabledError,
  StorageAccountAlreadyTakenError,
} from "../../../../../src/plugins/resource/frontend/resources/errors";
import { FrontendConfig } from "../../../../../src/plugins/resource/frontend/configs";
import {
  AzureErrorCode,
  FrontendConfigInfo,
} from "../../../../../src/plugins/resource/frontend/constants";
import { FrontendPlugin } from "../../../../../src/plugins/resource/frontend/";
import { FrontendProvision } from "../../../../../src/plugins/resource/frontend/ops/provision";
import { FrontendScaffold } from "../../../../../src/plugins/resource/frontend/ops/scaffold";
import { TestHelper } from "../helper";
import { Utils } from "../../../../../src/plugins/resource/frontend/utils";
import { StorageAccounts } from "@azure/arm-storage";
import { AzureLib } from "../../../../../src/plugins/resource/frontend/utils/azure-client";

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
      sinon.restore();
    });

    it("happy path", async () => {
      sinon.stub(FrontendScaffold, "getTemplateURL").resolves(faker.internet.url());
      sinon.stub(FrontendScaffold, "fetchZipFromUrl").resolves(new AdmZip());
      sinon.stub(FrontendScaffold, "scaffoldFromZip");

      const result = await frontendPlugin.scaffold(pluginContext);

      chai.assert.isTrue(result.isOk());
    });
  });

  describe("preProvision", () => {
    let frontendPlugin: FrontendPlugin;
    let pluginContext: PluginContext;

    beforeEach(async () => {
      pluginContext = TestHelper.getFakePluginContext();
      frontendPlugin = new FrontendPlugin();
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      sinon.stub(AzureStorageClient.prototype, "doesResourceGroupExists").resolves(true);

      const result: Result<FrontendConfig, Error> = await frontendPlugin.preProvision(
        pluginContext
      );

      chai.assert.isTrue(result.isOk());
    });

    it("resource group not exists", async () => {
      sinon.stub(AzureStorageClient.prototype, "doesResourceGroupExists").resolves(false);

      const result = await frontendPlugin.preProvision(pluginContext);

      assertError(result, new NoResourceGroupError().code);
    });
  });

  describe("provision", () => {
    let frontendPlugin: FrontendPlugin;
    let pluginContext: PluginContext;

    let createStorageAccountStub: sinon.SinonStub;
    let enableStaticWebsiteStub: sinon.SinonStub;

    beforeEach(async () => {
      pluginContext = TestHelper.getFakePluginContext();
      frontendPlugin = new FrontendPlugin();

      createStorageAccountStub = sinon
        .stub(StorageAccounts.prototype, "create")
        .resolves(TestHelper.storageAccount);
      enableStaticWebsiteStub = sinon.stub(AzureStorageClient.prototype, "enableStaticWebsite");
      sinon.stub(AzureLib, "ensureResourceProviders");
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const domain = new URL(TestHelper.storageEndpoint).hostname;

      const result = await frontendPlugin.provision(pluginContext);

      chai.assert.isTrue(result.isOk());
      chai.assert.equal(
        pluginContext.config.get(FrontendConfigInfo.Endpoint),
        TestHelper.storageEndpoint
      );
      chai.assert.equal(pluginContext.config.get(FrontendConfigInfo.Domain), domain);
    });

    it("create storage throw error", async () => {
      createStorageAccountStub.throws(Error);

      const result = await frontendPlugin.provision(pluginContext);

      assertError(result, new CreateStorageAccountError().code);
    });

    it("storage Account already taken", async () => {
      createStorageAccountStub.throws({ code: AzureErrorCode.StorageAccountAlreadyTaken });

      const result = await frontendPlugin.provision(pluginContext);

      assertError(result, new StorageAccountAlreadyTakenError().code);
    });

    it("storage name contains reserved word", async () => {
      createStorageAccountStub.throws({ code: AzureErrorCode.ReservedResourceName });

      const result = await frontendPlugin.provision(pluginContext);

      assertError(result, new InvalidStorageNameError().code);
    });

    it("enable static website throw error", async () => {
      enableStaticWebsiteStub.throws(Error);

      const result = await frontendPlugin.provision(pluginContext);

      assertError(result, new EnableStaticWebsiteError().code);
    });
  });

  describe("postProvision", () => {
    let frontendPlugin: FrontendPlugin;
    let pluginContext: PluginContext;

    beforeEach(async () => {
      pluginContext = TestHelper.getFakePluginContext();
      pluginContext.config.set(FrontendConfigInfo.Endpoint, TestHelper.storageEndpoint);
      frontendPlugin = new FrontendPlugin();
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      sinon.stub(FrontendProvision, "setEnvironments");

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
      sinon.stub(AzureStorageClient.prototype, "getContainer").resolves({} as any);
      sinon.stub(AzureStorageClient.prototype, "deleteAllBlobs").resolves();
      sinon.stub(AzureStorageClient.prototype, "uploadFiles").resolves();
      sinon.stub(Utils, "execute").resolves();
      sinon.stub(fs, "ensureDir").resolves();
      sinon.stub(fs, "readJSON").resolves({});
      sinon.stub(fs, "writeJSON").resolves();
      fsPathExistsStub = sinon.stub(fs, "pathExists").resolves(true);
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
