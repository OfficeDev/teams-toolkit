// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";

import {
  AzureClientFactory,
  AzureLib,
} from "../../../../../src/plugins/resource/function/utils/azure-client";
import {
  DependentPluginInfo,
  FunctionPluginInfo,
  FunctionPluginPathInfo,
} from "../../../../../src/plugins/resource/function/constants";
import { NodeVersion } from "../../../../../src/plugins/resource/function/enums";
import { FunctionPlugin } from "../../../../../src/plugins/resource/function";
import { Platform } from "@microsoft/teamsfx-api";

const context: any = {
  configOfOtherPlugins: new Map<string, Map<string, string | string[]>>([
    [
      DependentPluginInfo.solutionPluginName,
      new Map<string, string | string[]>([
        [DependentPluginInfo.resourceGroupName, "ut"],
        [DependentPluginInfo.subscriptionId, "ut"],
        [DependentPluginInfo.resourceNameSuffix, "ut"],
        [DependentPluginInfo.location, "ut"],
        [DependentPluginInfo.programmingLanguage, "javascript"],
      ]),
    ],
    [
      DependentPluginInfo.aadPluginName,
      new Map<string, string>([
        [DependentPluginInfo.aadClientId, "ut"],
        [DependentPluginInfo.aadClientSecret, "ut"],
        [DependentPluginInfo.oauthHost, "ut"],
        [DependentPluginInfo.tenantId, "ut"],
        [DependentPluginInfo.applicationIdUris, "ut"],
      ]),
    ],
    [
      DependentPluginInfo.frontendPluginName,
      new Map<string, string>([
        [DependentPluginInfo.frontendDomain, "ut"],
        [DependentPluginInfo.frontendEndpoint, "ut"],
      ]),
    ],
    [
      DependentPluginInfo.identityPluginName,
      new Map<string, string>([
        [DependentPluginInfo.identityId, "ut"],
        [DependentPluginInfo.identityName, "ut"],
      ]),
    ],
    [
      DependentPluginInfo.sqlPluginName,
      new Map<string, string>([
        [DependentPluginInfo.sqlPluginName, "ut"],
        [DependentPluginInfo.sqlEndpoint, "ut"],
        [DependentPluginInfo.databaseName, "ut"],
      ]),
    ],
    [
      DependentPluginInfo.apimPluginName,
      new Map<string, string>([[DependentPluginInfo.apimAppId, "ut"]]),
    ],
  ]),
  app: {
    name: {
      short: "ut",
    },
  },
  config: new Map<string, string>([["nodeVersion", NodeVersion.Version14]]),
  projectSettings: {
    appName: "ut",
    solutionSettings: {
      activeResourcePlugins: [
        DependentPluginInfo.aadPluginName,
        DependentPluginInfo.frontendPluginName,
        DependentPluginInfo.identityPluginName,
        DependentPluginInfo.sqlPluginName,
        DependentPluginInfo.apimPluginName,
      ],
    },
  },
  azureAccountProvider: {
    getAccountCredentialAsync: async () => ({
      signRequest: () => {
        return;
      },
    }),
    getSelectedSubscription: async () => {
      return {
        subscriptionId: "subscriptionId",
        tenantId: "tenantId",
        subscriptionName: "subscriptionName",
      };
    },
  },
  root: __dirname,
  answers: { platform: Platform.VSCode },
};

describe(FunctionPluginInfo.pluginName, () => {
  describe("Function Provision Test", () => {
    before(() => {
      fs.mkdirSync(path.join(context.root, FunctionPluginPathInfo.solutionFolderName));
    });

    afterEach(() => {
      sinon.restore();
    });

    after(() => {
      fs.emptyDirSync(path.join(context.root, FunctionPluginPathInfo.solutionFolderName));
      fs.rmdirSync(path.join(context.root, FunctionPluginPathInfo.solutionFolderName));
    });

    it("Test provision", async () => {
      // Arrange
      const functionApp: any = {
        defaultHostName: "ut",
      };
      sinon.stub(AzureLib, "ensureAppServicePlans").resolves({ id: 1 } as any);
      sinon.stub(AzureLib, "ensureStorageAccount").resolves({} as any);
      sinon.stub(AzureLib, "getConnectionString").resolves("ut connection string");
      sinon.stub(AzureLib, "ensureFunctionApp").resolves(functionApp);
      sinon.stub(AzureLib, "findFunctionApp").resolves(functionApp);
      sinon.stub(AzureLib, "findResourceProvider").resolves({} as any);
      sinon.stub(AzureClientFactory, "getWebSiteManagementClient").returns({
        webApps: {
          updateAuthSettings: () => undefined,
          update: () => undefined,
          listApplicationSettings: () => [],
        },
      } as any);
      const plugin: FunctionPlugin = new FunctionPlugin();

      const res1 = await plugin.preProvision(context);
      const res2 = await plugin.provision(context);
      const res3 = await plugin.postProvision(context);

      chai.assert.isTrue(res1.isOk());
      chai.assert.isTrue(res2.isOk());
      chai.assert.isTrue(res3.isOk());
    });
  });
});
