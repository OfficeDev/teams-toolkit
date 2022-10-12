// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as tools from "../../../../src/common/tools";
import { AzureStorageDeployDriver } from "../../../../src/component/driver/deploy/azureStorageDeployDriver";
import { DeployArgs } from "../../../../src/component/driver/interface/buildAndDeployArgs";
import { TestAzureAccountProvider } from "../../util/azureAccountMock";
import { TestLogProvider } from "../../util/logProviderMock";
import { assert } from "chai";
import {
  ListAccountSasResponse,
  StorageAccounts,
  StorageManagementClient,
} from "@azure/arm-storage";
import { BlobDeleteResponse, ContainerClient } from "@azure/storage-blob";
import { MyTokenCredential } from "../../../plugins/solution/util";
import * as armStorage from "@azure/arm-storage";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";

function getMockStorageAccount1() {
  return {
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
    const res = await deploy.run(args, context);
    assert.equal(res.isOk(), true);
  });

  it("get azure account credential error", async () => {
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

    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("clear storage error", async () => {
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    const deploy = new AzureStorageDeployDriver();
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    const clientStub = sandbox.createStubInstance(StorageManagementClient);
    clientStub.storageAccounts = {} as StorageAccounts;

    const mockStorageManagementClient = new StorageManagementClient(new MyTokenCredential(), "id");
    mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;
    const args = {
      src: "./",
      dist: "./",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Storage/storageAccounts/some-server-farm",
    } as DeployArgs;
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
      .resolves({ errorCode: "403" } as BlobDeleteResponse);
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });
});
