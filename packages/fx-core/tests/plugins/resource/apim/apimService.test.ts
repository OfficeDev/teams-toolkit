// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import { assert, createSandbox, match } from "sinon";
import fs from "fs-extra";
import { ApimService } from "../../../../src/component/resource/apim/services/apimService";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import {
  ApimDefaultValues,
  OpenApiSchemaVersion,
} from "../../../../src/component/resource/apim/constants";
import {
  mockApimService,
  mockApiManagementService,
  StubbedClass,
  DefaultTestInput,
  mockApiVersionSet,
  mockApi,
  mockProductApi,
  MockTokenCredentials,
} from "./mock";
import { createCipheriv } from "crypto";

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
          (
            await apimService!.getService(
              DefaultTestInput.resourceGroup.existing,
              DefaultTestInput.apimServiceName.new
            )
          )?.name
        )
        .to.equal("name2");
    });

    it("exist", async () => {
      chai
        .expect(
          (
            await apimService!.getService(
              DefaultTestInput.resourceGroup.existing,
              DefaultTestInput.apimServiceName.existing
            )
          )?.name
        )
        .to.equal("name2");
    });

    it("not exist resource group", async () => {
      try {
        await apimService!.getService(
          DefaultTestInput.resourceGroup.new,
          DefaultTestInput.apimServiceName.existing
        );
      } catch (e) {
        chai.expect(e.name).to.equal("ApimOperationError");
      }
    });
  });

  describe("#getUserId()", () => {
    const sandbox = createSandbox();
    let apimService: ApimService | undefined;
    beforeEach(async () => {
      const res = mockApimService(sandbox);
      apimService = res.apimService;
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("exist user id", async () => {
      chai.expect(await apimService!.getUserId()).to.equal("test@test.com");
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
      const res = await apimService!.createVersionSet(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.versionSet.new,
        "test-version-set-name"
      );
      chai.expect(res).to.equal(undefined);
    });

    it("skip to create an existing version set", async () => {
      const res = await apimService!.createVersionSet(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.versionSet.existing
      );
      chai.expect(res).to.equal(undefined);
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
      const res = await apimService!.importApi(
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

      chai.expect(res).to.equal(undefined);
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
      const res = await apimService!.addApiToProduct(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.productId.new,
        DefaultTestInput.apiId.new
      );

      chai.expect(res).to.equal(undefined);
    });

    it("skip add api to a product", async () => {
      const res = await apimService!.addApiToProduct(
        DefaultTestInput.resourceGroup.existing,
        DefaultTestInput.apimServiceName.existing,
        DefaultTestInput.productId.existing,
        DefaultTestInput.apiId.existing
      );

      chai.expect(res).to.equal(undefined);
    });
  });
});

async function loadSpec(titleSuffix: string): Promise<any> {
  const spec = await fs.readJson(`${UT_TEST_DATA_FOLDER}/openapi.json`, { encoding: "utf-8" });
  spec.info.title = `${spec.info.title}-${titleSuffix}`;
  return spec;
}
