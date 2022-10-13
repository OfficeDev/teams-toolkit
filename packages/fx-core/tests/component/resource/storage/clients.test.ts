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
import {
  ListAccountSasResponse,
  StorageAccount,
  StorageManagementClient,
  StorageAccountsCreateResponse,
} from "@azure/arm-storage";
import chaiAsPromised from "chai-as-promised";
import { AccessToken, TokenCredential } from "@azure/core-auth";
import * as armStorage from "@azure/arm-storage";
import { AzureStorageClient } from "../../../../src/component/resource/azureStorage/clients";
import * as utils from "../../../../src/component/utils/fileOperation";
import { StorageConfig } from "../../../../src/component/resource/azureStorage/configs";

chai.use(chaiAsPromised);

const getFakeAzureStorageClient = (): AzureStorageClient => {
  const config = new StorageConfig("subs", "rg", "location", "storage", undefined!);
  return new AzureStorageClient(config);
};

class MyTokenCredential implements TokenCredential {
  getToken(): Promise<AccessToken | null> {
    throw new Error("Method not implemented.");
  }
}

function getMockStorageAccount1(storageAccount?: StorageAccount) {
  return {
    beginCreateAndWait: async function (): Promise<StorageAccountsCreateResponse> {
      return storageAccount!;
    },
    listAccountSAS: async function (): Promise<ListAccountSasResponse> {
      return {
        accountSasToken: faker.internet.password(),
      };
    },
  };
}

describe("AzureStorageClient", () => {
  describe("enableStaticWebsite", () => {
    let setPropertiesStub: sinon.SinonStub;
    before(() => {
      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
      sinon.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
    });
    beforeEach(() => {
      setPropertiesStub = sinon.stub(BlobServiceClient.prototype, "setProperties");
      sinon.stub(AzureStorageClient.prototype, "isStorageStaticWebsiteEnabled").resolves(false);
    });
    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const azureClient = getFakeAzureStorageClient();
      const parameters = AzureStorageClient.getStaticWebsiteEnableParams();

      await azureClient.enableStaticWebsite();
      const args: any[] = setPropertiesStub.getCall(0).args;
      chai.assert.deepEqual(args, [parameters]);
    });
  });

  describe("deleteAllBlobs", async () => {
    beforeEach(() => {
      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
      sinon.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
      sinon.stub(ContainerClient.prototype, "listBlobsFlat").returns([] as any);
      sinon.stub(ContainerClient.prototype, "deleteBlob").resolves({} as any);
      sinon.stub(ContainerClient.prototype, "create").resolves();
      sinon.stub(ContainerClient.prototype, "exists").resolves(true);
      sinon.stub(utils, "listFilePaths").resolves([faker.system.filePath()]);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const azureClient = getFakeAzureStorageClient();

      const container = await azureClient.getContainer(faker.lorem.word());
      await azureClient.deleteAllBlobs(container);
    });
  });

  describe("uploadFiles", async () => {
    beforeEach(() => {
      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
      sinon.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
      sinon.stub(ContainerClient.prototype, "create").resolves();
      sinon.stub(ContainerClient.prototype, "exists").resolves(true);
      sinon.stub(BlockBlobClient.prototype, "uploadFile").resolves({} as any);
      sinon.stub(utils, "listFilePaths").resolves([faker.system.filePath()]);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const azureClient = getFakeAzureStorageClient();

      const sourceFolder = faker.system.directoryPath();
      const container = await azureClient.getContainer(faker.lorem.word());
      await azureClient.uploadFiles(container, sourceFolder);
    });
  });

  describe("isStorageStaticWebsiteEnabled", async () => {
    const samplePropertiesResponse =
      AzureStorageClient.getStaticWebsiteEnableParams() as ServiceGetPropertiesResponse;
    let azureClient: AzureStorageClient;

    before(() => {
      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
      sinon.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
    });
    beforeEach(async () => {
      azureClient = getFakeAzureStorageClient();
      sinon.stub(BlobServiceClient.prototype, "getProperties").resolves(samplePropertiesResponse);
      sinon.stub(ContainerClient.prototype, "exists").resolves(true);
    });

    it("happy path", async () => {
      const result = await azureClient.isStorageStaticWebsiteEnabled();
      chai.assert.isTrue(result);
    });
  });
});
