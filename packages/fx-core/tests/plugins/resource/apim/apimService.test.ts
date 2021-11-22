// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import { assert, createSandbox, match } from "sinon";
import fs from "fs-extra";
import { ApimService } from "../../../../src/plugins/resource/apim/services/apimService";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import {
  ApimDefaultValues,
  OpenApiSchemaVersion,
} from "../../../../src/plugins/resource/apim/constants";
import {
  mockApimService,
  mockApiManagementService,
  StubbedClass,
  DefaultTestInput,
  mockApiVersionSet,
  mockApi,
  mockProductApi,
  mockCredential,
  MockTokenCredentials,
} from "./mock";

dotenv.config();
chai.use(chaiAsPromised);

const UT_TEST_DATA_FOLDER = "./tests/plugins/resource/apim/data/apimService";

describe("ApimService", () => {
  describe("#getService()", () => {
    const sandbox = createSandbox();
    let apimService: ApimService | undefined;
    let apiManagementClient: StubbedClass<ApiManagementClient> | undefined;
    let apiManagementServiceStub: any;
    beforeEach(async () => {
      const res = mockApimService(sandbox);
      apimService = res.apimService;
      apiManagementClient = res.apiManagementClient;
      apiManagementServiceStub = mockApiManagementService(sandbox);
      apiManagementClient.apiManagementService = apiManagementServiceStub;
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("not exist", async () => {
      chai
        .expect(
          await apimService!.getService(
            DefaultTestInput.resourceGroup.existing,
            DefaultTestInput.apimServiceName.new
          )
        )
        .to.equal(undefined);
      sandbox.assert.calledOnce(apiManagementServiceStub!.get);
    });

    it("exist", async () => {
      chai
        .expect(
          await apimService!.getService(
            DefaultTestInput.resourceGroup.existing,
            DefaultTestInput.apimServiceName.existing
          )
        )
        .to.not.equal(undefined);
      assert.calledOnce(apiManagementServiceStub!.get);
    });

    it("not exist resource group", async () => {
      await chai
        .expect(
          apimService!.getService(
            DefaultTestInput.resourceGroup.new,
            DefaultTestInput.apimServiceName.existing
          )
        )
        .to.be.rejectedWith(
          `Resource group '${DefaultTestInput.resourceGroup.new}' could not be found.`
        );
      assert.calledOnce(apiManagementServiceStub!.get);
    });
  });

  describe("#getUserId()", () => {
    const sandbox = createSandbox();
    let apimService: ApimService | undefined;
    let credential: StubbedClass<MockTokenCredentials> | undefined;
    beforeEach(async () => {
      const res = mockApimService(sandbox);
      apimService = res.apimService;
      credential = res.credential;
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("exist user id", async () => {
      mockCredential(sandbox, credential!, { userId: "test@test.com" });
      chai.expect(await apimService!.getUserId()).to.equal("test@test.com");
      sandbox.assert.calledOnce(credential!.getToken);
    });

    it("not exist user id", async () => {
      mockCredential(sandbox, credential!, {});
      chai.expect(await apimService!.getUserId()).to.equal(ApimDefaultValues.userId);
      assert.calledOnce(credential!.getToken);
    });
  });

  describe("#createService()", () => {
    const sandbox = createSandbox();
    let apimService: ApimService | undefined;
    let apiManagementClient: StubbedClass<ApiManagementClient> | undefined;
    let apiManagementServiceStub: any;

    beforeEach(() => {
      const res = mockApimService(sandbox);
      apimService = res.apimService;
      apiManagementClient = res.apiManagementClient;
      apiManagementServiceStub = mockApiManagementService(sandbox);
      apiManagementClient.apiManagementService = apiManagementServiceStub;
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("create a new service", async () => {
      await apimService!.createService(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.new,
        "eastus",
        "test@uitest.com"
      );

      sandbox.assert.calledOnceWithMatch(
        apiManagementServiceStub.createOrUpdate,
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.new,
        match
          .has("location", "eastus")
          .and(match.has("publisherName", "test@uitest.com"))
          .and(match.has("sku", match.has("name", "Consumption").and(match.has("capacity", 0))))
      );

      assert.calledOnce(apiManagementServiceStub.createOrUpdate);
      assert.calledOnce(apiManagementServiceStub.get);
    });

    it("skip an existing service", async () => {
      await apimService!.createService(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        "eastus",
        "test@uitest.com"
      );

      assert.notCalled(apiManagementServiceStub.createOrUpdate);
      assert.calledOnce(apiManagementServiceStub.get);
    });
  });

  describe("#createVersionSet()", () => {
    const sandbox = createSandbox();
    let apimService: ApimService | undefined;
    let apiManagementClient: StubbedClass<ApiManagementClient> | undefined;
    let apiVersionSet: any;

    beforeEach(() => {
      const res = mockApimService(sandbox);
      apimService = res.apimService;
      apiManagementClient = res.apiManagementClient;
      apiVersionSet = mockApiVersionSet(sandbox);
      apiManagementClient.apiVersionSet = apiVersionSet;
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("create a new version set", async () => {
      await apimService!.createVersionSet(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.versionSet.new,
        "test-version-set-name"
      );

      sandbox.assert.calledOnceWithMatch(
        apiVersionSet.createOrUpdate,
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.versionSet.new,
        match.has("displayName", "test-version-set-name")
      );
      assert.calledOnce(apiVersionSet.get);
    });

    it("skip to create an existing version set", async () => {
      await apimService!.createVersionSet(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.versionSet.existing
      );

      assert.notCalled(apiVersionSet.createOrUpdate);
      assert.calledOnce(apiVersionSet.get);
    });
  });

  describe("#importApi()", async () => {
    const sandbox = createSandbox();
    let apimService: ApimService | undefined;
    let apiManagementClient: StubbedClass<ApiManagementClient> | undefined;
    let api: any;

    beforeEach(() => {
      const res = mockApimService(sandbox);
      apimService = res.apimService;
      apiManagementClient = res.apiManagementClient;
      api = mockApi(sandbox);
      apiManagementClient.api = api;
    });

    afterEach(() => {
      sandbox.restore();
    });

    // TODO Validation error;
    it("create a new API", async () => {
      const spec = await loadSpec("existing");
      await apimService!.importApi(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.apiId.new,
        "test-api-path",
        "v1",
        "test-version-set-id",
        "test-oauth-server-id",
        OpenApiSchemaVersion.V3,
        spec
      );

      sandbox.assert.calledOnceWithMatch(
        api.createOrUpdate,
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.apiId.new,
        match
          .has(
            "authenticationSettings",
            match.has("oAuth2", match.has("authorizationServerId", "test-oauth-server-id"))
          )
          .and(match.has("path", "test-api-path"))
          .and(match.has("apiVersion", "v1"))
          .and(match.has("apiVersionSetId", "/apiVersionSets/test-version-set-id"))
          .and(match.has("format", "openapi+json"))
          .and(match.has("value", match.string))
          .and(match.has("subscriptionRequired", false))
      );
    });
  });

  describe("#addApiToProduct()", () => {
    const sandbox = createSandbox();
    let apimService: ApimService | undefined;
    let apiManagementClient: StubbedClass<ApiManagementClient> | undefined;
    let productApi: any;

    beforeEach(() => {
      const res = mockApimService(sandbox);
      apimService = res.apimService;
      apiManagementClient = res.apiManagementClient;
      productApi = mockProductApi(sandbox);
      apiManagementClient.productApi = productApi;
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("add api to a product", async () => {
      await apimService!.addApiToProduct(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.productId.new,
        DefaultTestInput.apiId.new
      );

      assert.calledOnce(productApi.checkEntityExists);
      sandbox.assert.calledOnceWithMatch(
        productApi.createOrUpdate,
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.productId.new,
        DefaultTestInput.apiId.new
      );
    });

    it("skip add api to a product", async () => {
      await apimService!.addApiToProduct(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.productId.existing,
        DefaultTestInput.apiId.existing
      );

      assert.calledOnce(productApi.checkEntityExists);
      assert.notCalled(productApi.createOrUpdate);
    });
  });
});

async function loadSpec(titleSuffix: string): Promise<any> {
  const spec = await fs.readJson(`${UT_TEST_DATA_FOLDER}/openapi.json`, { encoding: "utf-8" });
  spec.info.title = `${spec.info.title}-${titleSuffix}`;
  return spec;
}
