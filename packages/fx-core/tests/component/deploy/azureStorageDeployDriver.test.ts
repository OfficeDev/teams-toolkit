// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as tools from "../../../src/common/tools";
import { AzureStorageDeployDriver } from "../../../src/component/deploy/azureStorageDeployDriver";
import { DeployArgs } from "../../../src/component/interface/buildAndDeployArgs";
import { TestAzureAccountProvider } from "../util/azureAccountMock";
import { TestLogProvider } from "../util/logProviderMock";
import { expect, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  ListAccountSasResponse,
  StorageAccounts,
  StorageManagementClient,
} from "@azure/arm-storage";
import { BlobDeleteResponse, ContainerClient } from "@azure/storage-blob";
import { MyTokenCredential } from "../../plugins/solution/util";
import * as armStorage from "@azure/arm-storage";

import { DriverContext } from "../../../src/component/interface/commonArgs";
chaiUse(chaiAsPromised);

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

describe("Azure Storage Deploy Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("deploy to storage happy path", async () => {
    const deploy = new AzureStorageDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Storage/storageAccounts/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    const clientStub = sandbox.createStubInstance(StorageManagementClient);
    clientStub.storageAccounts = {} as StorageAccounts;
    const mockStorageManagementClient = new StorageManagementClient(new MyTokenCredential(), "id");
    mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
    sandbox.stub(armStorage, "StorageManagementClient").returns(mockStorageManagementClient);
    sandbox.stub(ContainerClient.prototype, "exists").resolves(false);
    sandbox.stub(ContainerClient.prototype, "create").resolves();
    sandbox.stub(ContainerClient.prototype, "listBlobsFlat").returns([
      {
        properties: {
          contentLength: 1,
        },
      },
    ] as any);
    //sandbox.stub(ContainerClient.prototype, "listBlobsFlat").resolves();
    sandbox
      .stub(ContainerClient.prototype, "deleteBlob")
      .resolves({ errorCode: undefined } as BlobDeleteResponse);
    /*const calls = sandbox.stub().callsFake(() => clientStub);
    Object.setPrototypeOf(StorageManagementClient, calls);*/
    await deploy.run(args, context);
  });

  it("get azure account credential", async () => {
    const deploy = new AzureStorageDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Storage/storageAccounts/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .throws(new Error("error"));
    await expect(deploy.run(args, context)).to.be.rejectedWith(
      "Failed to retrieve Azure credentials."
    );
  });
});
