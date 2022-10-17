// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as tools from "../../../../../src/common/tools";
import { AzureStorageStaticWebsiteConfigDriver } from "../../../../../src/component/driver/deploy/azure/azureStorageStaticWebsiteConfigDriver";
import { TestAzureAccountProvider } from "../../../util/azureAccountMock";
import { TestLogProvider } from "../../../util/logProviderMock";
import { DriverContext } from "../../../../../src/component/driver/interface/commonArgs";
import { ListAccountSasResponse, StorageManagementClient } from "@azure/arm-storage";
import { BlobServiceClient, ServiceGetPropertiesResponse } from "@azure/storage-blob";
import { MyTokenCredential } from "../../../../plugins/solution/util";
import * as armStorage from "@azure/arm-storage";

describe("Azure App Service Deploy Driver test", () => {
  const sandbox = sinon.createSandbox();

  function getMockStorageAccount1() {
    return {
      // beginCreateAndWait: async function (
      //   resourceGroupName: string,
      //   accountName: string,
      //   parameters: StorageAccountCreateParameters,
      //   options?: StorageAccountsCreateOptionalParams
      // ): Promise<StorageAccountsCreateResponse> {
      //   return storageAccount!;
      // },
      listAccountSAS: async function (): Promise<ListAccountSasResponse> {
        return {
          accountSasToken: "abc",
        };
      },
    };
  }

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Azure Storage enable static website happy path", async () => {
    const driver = new AzureStorageStaticWebsiteConfigDriver();
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    // fake azure credentials
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());

    // fake sas account token
    const mockStorageManagementClient = new StorageManagementClient(new MyTokenCredential(), "id");
    mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
    sandbox.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);

    // fake properties
    sandbox.stub(BlobServiceClient.prototype, "getProperties").resolves({
      staticWebsite: {
        enabled: false,
      },
    } as ServiceGetPropertiesResponse);

    const caller = sandbox.stub(BlobServiceClient.prototype, "setProperties").resolves();

    const res = await driver.run(
      {
        storageResourceId:
          "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Storage/storageAccounts/some-server-farm",
        indexPage: "index.html",
        errorPage: "error.html",
      },
      context
    );

    sinon.assert.calledOnce(caller);
    chai.assert.equal(res.isOk(), true);
  });

  it("should skip enable static website", async () => {
    const driver = new AzureStorageStaticWebsiteConfigDriver();
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    // fake azure credentials
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());

    // fake sas account token
    const mockStorageManagementClient = new StorageManagementClient(new MyTokenCredential(), "id");
    mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
    sandbox.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);

    // fake properties
    sandbox.stub(BlobServiceClient.prototype, "getProperties").resolves({
      staticWebsite: {
        enabled: true,
      },
    } as ServiceGetPropertiesResponse);

    const caller = sandbox.stub(BlobServiceClient.prototype, "setProperties").resolves();

    await driver.run(
      {
        storageResourceId:
          "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Storage/storageAccounts/some-server-farm",
        indexPage: "index.html",
        errorPage: "error.html",
      },
      context
    );

    sinon.assert.notCalled(caller);
  });
});
