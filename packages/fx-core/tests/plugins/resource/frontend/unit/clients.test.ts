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
  AccountSasParameters,
  ListAccountSasResponse,
  StorageAccount,
  StorageAccountCreateParameters,
  StorageAccountsCreateOptionalParams,
  StorageAccountsListAccountSASOptionalParams,
  StorageManagementClient,
} from "@azure/arm-storage";
import { StorageAccountsCreateResponse } from "@azure/arm-storage";
import chaiAsPromised from "chai-as-promised";

import { AzureStorageClient } from "../../../../../src/plugins/resource/frontend/clients";
import { TestHelper } from "../helper";
import { Utils } from "../../../../../src/plugins/resource/frontend/utils";
import {
  ResourceGroupsCheckExistenceOptionalParams,
  ResourceGroupsCheckExistenceResponse,
  ResourceManagementClient,
} from "@azure/arm-resources";
import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import * as armResources from "@azure/arm-resources";
import * as armStorage from "@azure/arm-storage";

chai.use(chaiAsPromised);

const mockResourceGroups = {
  checkExistence: async function (
    resourceGroupName: string,
    options?: ResourceGroupsCheckExistenceOptionalParams
  ): Promise<ResourceGroupsCheckExistenceResponse> {
    return {
      body: true,
    };
  },
};

class MyTokenCredential implements TokenCredential {
  getToken(
    scopes: string | string[],
    options?: GetTokenOptions | undefined
  ): Promise<AccessToken | null> {
    throw new Error("Method not implemented.");
  }
}

function getMockStorageAccount1(storageAccount?: StorageAccount) {
  return {
    beginCreateAndWait: async function (
      resourceGroupName: string,
      accountName: string,
      parameters: StorageAccountCreateParameters,
      options?: StorageAccountsCreateOptionalParams
    ): Promise<StorageAccountsCreateResponse> {
      return storageAccount!;
    },
    listAccountSAS: async function (
      resourceGroupName: string,
      accountName: string,
      parameters: AccountSasParameters,
      options?: StorageAccountsListAccountSASOptionalParams
    ): Promise<ListAccountSasResponse> {
      return {
        accountSasToken: faker.internet.password(),
      };
    },
  };
}

describe("AzureStorageClient", () => {
  describe("doesResourceGroupExists", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const mockResourceManagementClient = new ResourceManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockResourceManagementClient.resourceGroups = mockResourceGroups as any;
      sinon.stub(armResources, "ResourceManagementClient").returns(mockResourceManagementClient);
      const azureClient = await TestHelper.getFakeAzureStorageClient();

      const result: boolean = await azureClient.doesResourceGroupExists();
      chai.assert.isTrue(result);
    });
  });

  describe("createStorageAccount", () => {
    const sampleStorageAccount = TestHelper.storageAccount;

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1(
        sampleStorageAccount
      ) as any;
      sinon.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
      const azureClient = await TestHelper.getFakeAzureStorageClient();
      const result = await azureClient.createStorageAccount();

      chai.assert.equal(result, sampleStorageAccount.primaryEndpoints?.web);
    });

    it("empty endpoint", async () => {
      const azureClient = await TestHelper.getFakeAzureStorageClient();
      const emptyResponse = {} as StorageAccountsCreateResponse;

      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1(emptyResponse) as any;
      sinon.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
      await chai.expect(azureClient.createStorageAccount()).to.eventually.be.rejectedWith();
    });
  });

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
      const azureClient = await TestHelper.getFakeAzureStorageClient();
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
      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
      sinon.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
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

    before(() => {
      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
      sinon.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
    });
    beforeEach(async () => {
      azureClient = await TestHelper.getFakeAzureStorageClient();
      sinon.stub(BlobServiceClient.prototype, "getProperties").resolves(samplePropertiesResponse);
      sinon.stub(ContainerClient.prototype, "exists").resolves(true);
    });

    it("happy path", async () => {
      const result = await azureClient.isStorageStaticWebsiteEnabled();
      chai.assert.isTrue(result);
    });
  });
});
