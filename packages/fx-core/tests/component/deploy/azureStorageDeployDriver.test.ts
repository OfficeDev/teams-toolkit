// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as tools from "../../../src/common/tools";
import { AzureStorageDeployDriver } from "../../../src/component/deploy/azureStorageDeployDriver";
import { DeployArgs, DriverContext } from "../../../src/component/interface/buildAndDeployArgs";
import { FakeTokenCredentials, TestAzureAccountProvider } from "../util/azureAccountMock";
import { TestLogProvider } from "../util/logProviderMock";
import { expect, use as chaiUse } from "chai";
import chaiAsPromised = require("chai-as-promised");
import { StorageAccounts, StorageManagementClient } from "@azure/arm-storage";
import { StorageAccountsListAccountSASResponse } from "@azure/arm-storage/esm/models";
import { BlobDeleteResponse, BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { PagedAsyncIterableIterator } from "@azure/core-paging";
chaiUse(chaiAsPromised);

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
    const fake = new FakeTokenCredentials("x", "y");
    sandbox.stub(context.azureAccountProvider, "getAccountCredentialAsync").resolves(fake);
    const clientStub = sandbox.createStubInstance(StorageManagementClient);
    clientStub.storageAccounts = {} as StorageAccounts;
    sandbox.stub(StorageAccounts.prototype, "listAccountSAS").resolves({
      accountSasToken: "fakeToken",
    } as StorageAccountsListAccountSASResponse);
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
      .stub(context.azureAccountProvider, "getAccountCredentialAsync")
      .throws(new Error("error"));
    await expect(deploy.run(args, context)).to.be.rejectedWith(
      "Failed to retrieve Azure credentials."
    );
  });
});
