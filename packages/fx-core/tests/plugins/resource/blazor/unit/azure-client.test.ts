// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import { BlazorPluginInfo } from "../../../../../src/plugins/resource/blazor/constants";
import { AzureLib } from "../../../../../src/plugins/resource/blazor/utils/azure-client";

const client: any = {
  appServicePlans: {
    listByResourceGroup: () => [],
    createOrUpdate: () => undefined,
  },
  webApps: {
    listByResourceGroup: () => [],
    createOrUpdate: () => undefined,
  },
};

const resourceGroupName = "ut";

describe(BlazorPluginInfo.pluginName, async () => {
  describe("Azure Client Test", async () => {
    it("Test ensureAppServicePlan with existence", async () => {
      // Arrange
      const item: any = { name: "ut" };
      const appServicePlanName = "ut";
      const client: any = {
        appServicePlans: {
          listByResourceGroup: () => [item],
          createOrUpdate: () => undefined,
        },
      };

      // Act
      const res = await AzureLib.ensureAppServicePlan(
        client,
        resourceGroupName,
        appServicePlanName,
        {} as any
      );

      // Assert
      chai.assert.equal(res, item);
    });

    it("Test ensureAppServicePlan", async () => {
      // Arrange
      const appServicePlanName = "ut";

      // Act
      const res = await AzureLib.ensureAppServicePlan(
        client,
        resourceGroupName,
        appServicePlanName,
        {} as any
      );

      // Assert
      chai.assert.equal(res, undefined);
    });

    it("Test ensureWebApp", async () => {
      // Arrange
      const webAppName = "ut";

      // Act
      const res = await AzureLib.ensureWebApp(client, resourceGroupName, webAppName, {} as any);

      // Assert
      chai.assert.equal(res, undefined);
    });
  });
});
