// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";
import axios from "axios";

import { BackendExtensionsInstaller } from "../../../../../src/plugins/resource/function/utils/depsChecker/backendExtensionsInstall";

import * as dirWalk from "../../../../../src/plugins/resource/function/utils/dir-walk";
import * as execute from "../../../../../src/plugins/resource/function/utils/execute";
import { AzureClientFactory } from "../../../../../src/plugins/resource/function/utils/azure-client";
import {
  DependentPluginInfo,
  FunctionPluginInfo,
} from "../../../../../src/plugins/resource/function/constants";
import { FunctionDeploy } from "../../../../../src/plugins/resource/function/ops/deploy";
import { FunctionLanguage } from "../../../../../src/plugins/resource/function/enums";
import { FunctionPlugin } from "../../../../../src/plugins/resource/function";
import { Platform } from "@microsoft/teamsfx-api";

const context: any = {
  configOfOtherPlugins: new Map<string, Map<string, string>>([
    [
      DependentPluginInfo.solutionPluginName,
      new Map<string, string>([
        [DependentPluginInfo.resourceGroupName, "ut"],
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
        [DependentPluginInfo.oauthHost, "ut"],
        [DependentPluginInfo.tenantId, "ut"],
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
  config: new Map<string, string>([["functionAppName", "ut"]]),
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
  root: path.join(__dirname, "ut"),
  answers: { platform: Platform.VSCode },
};

describe(FunctionPluginInfo.pluginName, () => {
  describe("Function Deploy Test", () => {
    afterEach(() => {
      fs.emptyDirSync(context.root);
      fs.rmdirSync(context.root);
      sinon.restore();
    });

    it("Test deploy without change", async () => {
      // Arrange
      sinon.stub(FunctionDeploy, "hasUpdatedContent").resolves(false);
      const plugin: FunctionPlugin = new FunctionPlugin();

      // Act
      const res1 = await plugin.preDeploy(context);
      const res2 = await plugin.deploy(context);

      // Assert
      chai.assert.isTrue(res1.isOk());
      chai.assert.isTrue(res2.isOk());
    });

    it("Test deploy with change", async () => {
      // Arrange
      const apiPath = path.join(context.root, "api");
      await fs.emptyDir(apiPath);
      await fs.writeFile(path.join(apiPath, ".funcignore"), "ut");
      await fs.writeFile(path.join(apiPath, "ut.js"), "ut");
      sinon.stub(AzureClientFactory, "getWebSiteManagementClient").returns({
        webApps: {
          updateApplicationSettings: () => undefined,
          listApplicationSettings: () => [],
          restart: () => undefined,
          syncFunctionTriggers: () => undefined,
          listPublishingCredentials: () => ({
            publishingUserName: "ut",
            publishingPassword: "ut",
          }),
        },
      } as any);
      sinon.stub(axios, "post").resolves({ status: 200 });
      sinon.stub(execute, "execute").resolves("");
      sinon.stub(FunctionDeploy, "hasUpdatedContent").resolves(true);
      sinon.stub(BackendExtensionsInstaller.prototype, "install").resolves(undefined);
      const plugin: FunctionPlugin = new FunctionPlugin();

      // Act
      const res1 = await plugin.preDeploy(context);
      const res2 = await plugin.deploy(context);

      // Assert
      chai.assert.isTrue(res1.isOk());
      chai.assert.isTrue(res2.isOk());
    });

    it("Test hasUpdatedContent got last deployment time", async () => {
      // Arrange
      sinon.stub(FunctionDeploy, "getLastDeploymentTime").resolves(new Date());
      sinon.stub(dirWalk, "forEachFileAndDir").resolves(undefined);

      // Act
      const res = await FunctionDeploy.hasUpdatedContent("ut", FunctionLanguage.JavaScript);

      // Assert
      chai.assert.isFalse(res);
    });

    it("Test hasUpdatedContent fail to get last deployment time", async () => {
      // Arrange
      sinon.stub(dirWalk, "forEachFileAndDir").resolves(undefined);

      // Act
      const res = await FunctionDeploy.hasUpdatedContent("ut", FunctionLanguage.JavaScript);

      // Assert
      chai.assert.isTrue(res);
    });
  });
});
