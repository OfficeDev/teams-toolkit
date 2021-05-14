// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import * as faker from "faker";
import * as sinon from "sinon";
import {
  BlobServiceClient,
  BlockBlobClient,
  ContainerClient,
  ServiceGetPropertiesResponse,
} from "@azure/storage-blob";
import { ResourceGroups } from "@azure/arm-resources";
import { ResourceGroupsCheckExistenceResponse } from "@azure/arm-resources/esm/models";
import { StorageAccounts } from "@azure/arm-storage";
import {
  StorageAccountsCreateResponse,
  StorageAccountsListAccountSASResponse,
} from "@azure/arm-storage/esm/models";
import chaiAsPromised from "chai-as-promised";

import { AzureStorageClient } from "../../../../../src/plugins/resource/frontend/clients";
import { TestHelper } from "../helper";
import { Utils } from "../../../../../src/plugins/resource/frontend/utils";

chai.use(chaiAsPromised);

describe("AzureStorageClient", () => {
  const sampleStorageAccountListSasResult = {
    accountSasToken: faker.internet.password(),
  } as StorageAccountsListAccountSASResponse;

  describe("doesResourceGroupExists", () => {
    const sampleResponse = {
      body: true,
    } as ResourceGroupsCheckExistenceResponse;
    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const azureClient = await TestHelper.getFakeAzureStorageClient();
      const checkExistenceStub = sinon
        .stub(ResourceGroups.prototype, "checkExistence")
        .resolves(sampleResponse);

      const result: boolean = await azureClient.doesResourceGroupExists();

      const args: any[] = checkExistenceStub.getCall(0).args;
      chai.assert.deepEqual(args, [TestHelper.rgName]);
      chai.assert.isTrue(result);
    });
  });

  describe("createStorageAccount", () => {
    const sampleStorageAccount = TestHelper.storageAccount;

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const azureClient = await TestHelper.getFakeAzureStorageClient();
      sinon.stub(StorageAccounts.prototype, "create").resolves(sampleStorageAccount);

      const result = await azureClient.createStorageAccount();

      chai.assert.equal(result, sampleStorageAccount.primaryEndpoints?.web);
    });

    it("empty endpoint", async () => {
      const azureClient = await TestHelper.getFakeAzureStorageClient();
      const emptyResponse = {} as StorageAccountsCreateResponse;

      sinon.stub(StorageAccounts.prototype, "create").resolves(emptyResponse);
      await chai.expect(azureClient.createStorageAccount()).to.eventually.be.rejectedWith();
    });
  });

  describe("enableStaticWebsite", () => {
    let setPropertiesStub: sinon.SinonStub;
    beforeEach(() => {
      setPropertiesStub = sinon.stub(BlobServiceClient.prototype, "setProperties");
      sinon.stub(AzureStorageClient.prototype, "isStorageStaticWebsiteEnabled").resolves(false);
      sinon
        .stub(StorageAccounts.prototype, "listAccountSAS")
        .resolves(sampleStorageAccountListSasResult);
    });
    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const azureClient = await TestHelper.getFakeAzureStorageClient();
      const parameters = AzureStorageClient.getStaticWebsiteEnableParams();

      await azureClient.enableStaticWebsite();
      const args: any[] = setPropertiesStub.getCall(0).args;
      chai.assert.deepEqual(args, [parameters]);
    });
  });

  describe("deleteAllBlobs", async () => {
    beforeEach(() => {
      sinon
        .stub(StorageAccounts.prototype, "listAccountSAS")
        .resolves(sampleStorageAccountListSasResult);
      sinon.stub(ContainerClient.prototype, "listBlobsFlat").returns([] as any);
      sinon.stub(ContainerClient.prototype, "deleteBlob").resolves({} as any);
      sinon.stub(ContainerClient.prototype, "create").resolves();
      sinon.stub(ContainerClient.prototype, "exists").resolves(true);
      sinon.stub(Utils, "listFilePaths").resolves([faker.system.filePath()]);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const azureClient = await TestHelper.getFakeAzureStorageClient();

      const container = await azureClient.getContainer(faker.lorem.word());
      await azureClient.deleteAllBlobs(container);
    });
  });

  describe("uploadFiles", async () => {
    beforeEach(() => {
      sinon
        .stub(StorageAccounts.prototype, "listAccountSAS")
        .resolves(sampleStorageAccountListSasResult);
      sinon.stub(ContainerClient.prototype, "create").resolves();
      sinon.stub(ContainerClient.prototype, "exists").resolves(true);
      sinon.stub(BlockBlobClient.prototype, "uploadFile").resolves({} as any);
      sinon.stub(Utils, "listFilePaths").resolves([faker.system.filePath()]);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const azureClient = await TestHelper.getFakeAzureStorageClient();

      const sourceFolder = faker.system.directoryPath();
      const container = await azureClient.getContainer(faker.lorem.word());
      await azureClient.uploadFiles(container, sourceFolder);
    });
  });

  describe("isStorageStaticWebsiteEnabled", async () => {
    const samplePropertiesResponse =
      AzureStorageClient.getStaticWebsiteEnableParams() as ServiceGetPropertiesResponse;
    let azureClient: AzureStorageClient;

    beforeEach(async () => {
      azureClient = await TestHelper.getFakeAzureStorageClient();

      sinon
        .stub(StorageAccounts.prototype, "listAccountSAS")
        .resolves(sampleStorageAccountListSasResult);
      sinon.stub(BlobServiceClient.prototype, "getProperties").resolves(samplePropertiesResponse);
      sinon.stub(ContainerClient.prototype, "exists").resolves(true);
    });

    it("happy path", async () => {
      const result = await azureClient.isStorageStaticWebsiteEnabled();
      chai.assert.isTrue(result);
    });
  });
});
