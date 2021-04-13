// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import { AzureLib } from "../../../../../src/plugins/resource/function/utils/azure-client";
import { FunctionPluginInfo } from "../../../../../src/plugins/resource/function/constants";

const client : any = {
    appServicePlans: {
        listByResourceGroup: () => [],
        createOrUpdate: () => undefined
    },
    storageAccounts: {
        listByResourceGroup: () => [],
        create: () => undefined,
    },
    webApps: {
        listByResourceGroup: () => [],
        createOrUpdate: () => undefined
    }
};

const resourceGroupName = "ut";

describe(FunctionPluginInfo.pluginName, async () => {
    describe("Azure Client Test", async () => {
        it("Test ensureAppServicePlans with existence", async () => {
            // Arrange
            const appServicePlanName = "ut";
            const client : any = {
                appServicePlans: {
                    listByResourceGroup: () => [{ name: "ut" }],
                    createOrUpdate: () => undefined
                }
            };

            // Act
            const res = await AzureLib.ensureAppServicePlans(client, resourceGroupName, appServicePlanName, {} as any);

            // Assert
            chai.assert.equal(res, undefined);
        });

        it("Test ensureAppServicePlans", async () => {
            // Arrange
            const appServicePlanName = "ut";

            // Act
            const res = await AzureLib.ensureAppServicePlans(client, resourceGroupName, appServicePlanName, {} as any);

            // Assert
            chai.assert.equal(res, undefined);
        });

        it("Test ensureStorageAccount", async () => {
            // Arrange
            const storageName = "ut";

            // Act
            const res = await AzureLib.ensureStorageAccount(client, resourceGroupName, storageName, {} as any);

            // Assert
            chai.assert.equal(res, undefined);
        });

        it("Test ensureAppServicePlans", async () => {
            // Arrange
            const functionAppName = "ut";

            // Act
            const res = await AzureLib.ensureFunctionApp(client, resourceGroupName, functionAppName, {} as any);

            // Assert
            chai.assert.equal(res, undefined);
        });

        it("Test getConnectionString", async () => {
            // Arrange
            const storageName = "ut";
            const client : any = {
                storageAccounts: {
                    listByResourceGroup: () => [],
                    create: () => undefined,
                    listKeys: () => ({ keys: [{ value: "ut" }] })
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
            const client : any = {
                storageAccounts: {
                    listByResourceGroup: () => [],
                    create: () => undefined,
                    listKeys: () => ({ keys: [] })
                },
            };

            // Act
            const res = await AzureLib.getConnectionString(client, resourceGroupName, storageName);

            // Assert
            chai.assert.equal(res, undefined);
        });
    });
});
