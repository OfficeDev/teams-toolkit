// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as tools from "../../../src/common/tools";
import { AzureStorageStaticWebsiteConfigDriver } from "../../../src/component/provision/azureStorageStaticWebsiteConfigDriver";
import { FakeTokenCredentials, TestAzureAccountProvider } from "../util/azureAccountMock";
import { TestLogProvider } from "../util/logProviderMock";
import { DriverContext } from "../../../src/component/interface/commonArgs";
import { StorageAccounts } from "@azure/arm-storage";
import { StorageAccountsListAccountSASResponse } from "@azure/arm-storage/esm/models";
import { BlobServiceClient, ServiceGetPropertiesResponse } from "@azure/storage-blob";

describe("Azure App Service Deploy Driver test", () => {
  const sandbox = sinon.createSandbox();

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
    const fake = new FakeTokenCredentials("x", "y");
    sandbox.stub(context.azureAccountProvider, "getAccountCredentialAsync").resolves(fake);

    // fake sas account token
    sandbox.stub(StorageAccounts.prototype, "listAccountSAS").resolves({
      accountSasToken: "fakeToken",
    } as StorageAccountsListAccountSASResponse);

    // fake properties
    sandbox.stub(BlobServiceClient.prototype, "getProperties").resolves({
      staticWebsite: {
        enabled: false,
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

    sinon.assert.calledOnce(caller);
  });

  it("should skip enable static website", async () => {
    const driver = new AzureStorageStaticWebsiteConfigDriver();
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    // fake azure credentials
    const fake = new FakeTokenCredentials("x", "y");
    sandbox.stub(context.azureAccountProvider, "getAccountCredentialAsync").resolves(fake);

    // fake sas account token
    sandbox.stub(StorageAccounts.prototype, "listAccountSAS").resolves({
      accountSasToken: "fakeToken",
    } as StorageAccountsListAccountSASResponse);

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
