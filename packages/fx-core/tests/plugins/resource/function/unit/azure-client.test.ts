// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import { AzureLib } from "../../../../../src/plugins/resource/function/utils/azure-client";
import { FunctionPluginInfo } from "../../../../../src/plugins/resource/function/constants";
import {
  AppServicePlan,
  AppServicePlansCreateOrUpdateOptionalParams,
  AppServicePlansListByResourceGroupOptionalParams,
  Site,
  WebAppsCreateOrUpdateOptionalParams,
  WebAppsCreateOrUpdateResponse,
  WebAppsListByResourceGroupOptionalParams,
  WebSiteManagementClient,
} from "@azure/arm-appservice";
import { PagedAsyncIterableIterator } from "@azure/core-paging";
import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import * as sinon from "sinon";
import * as armAppService from "@azure/arm-appservice";
import {
  AccountSasParameters,
  ListAccountSasResponse,
  StorageAccount,
  StorageAccountCreateParameters,
  StorageAccountsCreateOptionalParams,
  StorageAccountsCreateResponse,
  StorageAccountsListAccountSASOptionalParams,
  StorageManagementClient,
} from "@azure/arm-storage";

const resourceGroupName = "ut";

function getMockAppServicePlan(name?: string) {
  return {
    listByResourceGroup: function (
      resourceGroupName: string,
      options?: AppServicePlansListByResourceGroupOptionalParams
    ): PagedAsyncIterableIterator<AppServicePlan> {
      return {
        next() {
          throw new Error("Function not implemented.");
        },
        [Symbol.asyncIterator]() {
          throw new Error("Function not implemented.");
        },
        byPage: () => {
          return generator() as any;
        },
      };

      function* generator() {
        if (name) {
          return [
            {
              resourceGroupName: name,
              name: name,
            },
          ];
        } else {
          return undefined;
        }
      }
    },
    beginCreateOrUpdateAndWait: async function (
      resourceGroupName: string,
      name: string,
      appServicePlan: AppServicePlan,
      options?: AppServicePlansCreateOrUpdateOptionalParams | undefined
    ): Promise<AppServicePlan> {
      if (name) {
        return {
          location: name,
          name: name,
        };
      } else {
        return {
          location: "ut",
          name: "ut",
        };
      }
    },
  };
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
        accountSasToken: "abc",
      };
    },
  };
}

function getMockWebApp() {
  return {
    listByResourceGroup: function (
      resourceGroupName: string,
      options?: WebAppsListByResourceGroupOptionalParams
    ): PagedAsyncIterableIterator<Site> {
      return {
        next() {
          throw new Error("Function not implemented.");
        },
        [Symbol.asyncIterator]() {
          throw new Error("Function not implemented.");
        },
        byPage: () => {
          return generator() as any;
        },
      };

      function* generator() {
        return [];
      }
    },
    beginCreateOrUpdateAndWait: async function (
      resourceGroupName: string,
      name: string,
      siteEnvelope: Site,
      options?: WebAppsCreateOrUpdateOptionalParams
    ): Promise<WebAppsCreateOrUpdateResponse> {
      return {
        location: "ut",
      };
    },
  };
}

class MyTokenCredential implements TokenCredential {
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions | undefined
  ): Promise<AccessToken | null> {
    return {
      token: "token",
      expiresOnTimestamp: 1234,
    };
  }
}

describe(FunctionPluginInfo.pluginName, async () => {
  describe("Azure Client Test", async () => {
    beforeEach(() => {
      const mockWebSiteManagementClient = new WebSiteManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockWebSiteManagementClient.appServicePlans = getMockAppServicePlan("ut") as any;
      sinon.stub(armAppService, "WebSiteManagementClient").returns(mockWebSiteManagementClient);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("Test ensureResourceProvider with existence", async () => {
      // Arrange
      const item: any = { registrationState: "Registered" };
      const namespace = ["ut"];
      const client: any = {
        get: (namespace: string) => item,
        register: (namespace: string) => item,
      };

      // Act
      const res = await AzureLib.ensureResourceProviders(client, namespace);

      // Assert
      chai.assert.deepEqual(res, [item]);
    });

    it("Test ensureResourceProvider", async () => {
      // Arrange
      const item: any = { registrationState: "Unregistered" };
      const namespace = ["ut"];
      const client: any = {
        get: (namespace: string) => item,
        register: (namespace: string) => item,
      };

      // Act
      const res = await AzureLib.ensureResourceProviders(client, namespace);

      // Assert
      chai.assert.deepEqual(res, [item]);
    });

    it("Test ensureAppServicePlans with existence", async () => {
      // Arrange
      const item: any = { name: "ut" };
      const appServicePlanName = "ut";
      const mockWebSiteManagementClient = new WebSiteManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockWebSiteManagementClient.appServicePlans = getMockAppServicePlan("ut") as any;
      // Act
      const res = await AzureLib.ensureAppServicePlans(
        mockWebSiteManagementClient,
        resourceGroupName,
        appServicePlanName,
        {} as any
      );

      // Assert
      chai.assert.equal(res.name, item.name);
    });

    it("Test ensureAppServicePlans", async () => {
      // Arrange
      const appServicePlanName = "ut";
      const mockWebSiteManagementClient = new WebSiteManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockWebSiteManagementClient.appServicePlans = getMockAppServicePlan() as any;
      // Act
      const res = await AzureLib.ensureAppServicePlans(
        mockWebSiteManagementClient,
        resourceGroupName,
        appServicePlanName,
        {} as any
      );

      // Assert
      chai.assert.equal(res.name, "ut");
    });

    it("Test ensureStorageAccount", async () => {
      // Arrange
      const storageName = "ut";
      const mockStorageManagementClient = new StorageManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockStorageManagementClient.storageAccounts = getMockStorageAccount1() as any;

      // Act
      const res = await AzureLib.ensureStorageAccount(
        mockStorageManagementClient,
        resourceGroupName,
        storageName,
        {} as any
      );

      // Assert
      chai.assert.equal(res, undefined);
    });

    it("Test ensureAppServicePlans", async () => {
      // Arrange
      const functionAppName = "ut";
      const mockWebSiteManagementClient = new WebSiteManagementClient(
        new MyTokenCredential(),
        "id"
      );
      mockWebSiteManagementClient.appServicePlans = getMockAppServicePlan() as any;
      mockWebSiteManagementClient.webApps = getMockWebApp() as any;

      // Act
      const res = await AzureLib.ensureFunctionApp(
        mockWebSiteManagementClient,
        resourceGroupName,
        functionAppName,
        {} as any
      );

      // Assert
      chai.assert.equal(res.name, undefined);
    });

    it("Test getConnectionString", async () => {
      // Arrange
      const storageName = "ut";
      const client: any = {
        storageAccounts: {
          listByResourceGroup: () => [],
          create: () => undefined,
          listKeys: () => ({ keys: [{ value: "ut" }] }),
        },
      };

      // Act
      const res = await AzureLib.getConnectionString(client, resourceGroupName, storageName);

      // Assert
      chai.assert.notEqual(res, undefined);
    });

    it("Test getConnectionString no key", async () => {
      // Arrange
      const storageName = "ut";
      const client: any = {
        storageAccounts: {
          listByResourceGroup: () => [],
          create: () => undefined,
          listKeys: () => ({ keys: [] }),
        },
      };

      // Act
      const res = await AzureLib.getConnectionString(client, resourceGroupName, storageName);

      // Assert
      chai.assert.equal(res, undefined);
    });
  });
});
