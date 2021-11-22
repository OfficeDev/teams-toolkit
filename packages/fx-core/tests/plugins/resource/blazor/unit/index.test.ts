// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import * as sinon from "sinon";
import fs from "fs-extra";
import { PluginContext, ReadonlyPluginConfig } from "@microsoft/teamsfx-api";
import chaiAsPromised from "chai-as-promised";

import { FrontendPlugin as BlazorPlugin } from "../../../../../src/plugins/resource/frontend";
import { TestHelper } from "../helper";
import {
  BlazorConfigInfo,
  BlazorPluginInfo,
  DependentPluginInfo,
} from "../../../../../src/plugins/resource/frontend/blazor/constants";
import {
  AzureClientFactory,
  AzureLib,
} from "../../../../../src/plugins/resource/frontend/blazor/utils/azure-client";
import { AppServicePlan } from "@azure/arm-appservice/esm/models";
import * as dirWalk from "../../../../../src/plugins/resource/function/utils/dir-walk";
import * as execute from "../../../../../src/plugins/resource/function/utils/execute";
import axios from "axios";
import * as core from "../../../../../src/core";
import { isArmSupportEnabled } from "../../../../../src";

chai.use(chaiAsPromised);

describe("BlazorPlugin", () => {
  describe("Provision", () => {
    let plugin: BlazorPlugin;
    let ctx: PluginContext;
    if (isArmSupportEnabled()) {
      return;
    }

    before(async () => {
      ctx = TestHelper.getFakePluginContext();
      plugin = new BlazorPlugin();
    });

    beforeEach(async () => {
      sinon.stub(core, "isVsCallingCli").returns(true);
      sinon.stub(AzureLib, "ensureAppServicePlan").resolves({
        id: TestHelper.appServicePlanId,
      } as AppServicePlan);
      sinon.stub(AzureLib, "ensureWebApp").resolves({
        defaultHostName: TestHelper.webAppDomain,
        siteConfig: {
          appSettings: [],
        },
      } as any);
      sinon.stub(AzureClientFactory, "getWebSiteManagementClient").returns({
        webApps: {
          update: () => undefined,
          listApplicationSettings: () => [],
        },
      } as any);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("pre-provision", async () => {
      // act
      const result = await plugin.preProvision(ctx);

      // assert
      const solutionConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
        DependentPluginInfo.solutionPluginName
      );
      const resourceNameSuffix = solutionConfig?.get(
        DependentPluginInfo.resourceNameSuffix
      ) as string;
      const appName: string = ctx.projectSettings!.appName;
      const expectedWebAppName = `${appName}${BlazorPluginInfo.alias}${resourceNameSuffix}`;

      chai.assert.equal(plugin.blazorPluginImpl.config.webAppName, expectedWebAppName);
      chai.assert.isTrue(result.isOk());
    });

    it("provision", async () => {
      const result = await plugin.provision(ctx);

      chai.assert.isTrue(result.isOk());
      chai.assert.equal(
        plugin.blazorPluginImpl.config.endpoint,
        `https://${TestHelper.webAppDomain}`
      );
    });

    it("post-provision", async () => {
      const result = await plugin.postProvision(ctx);

      chai.assert.isTrue(result.isOk());
    });
  });

  describe("deploy", () => {
    let plugin: BlazorPlugin;
    let pluginContext: PluginContext;

    beforeEach(async () => {
      plugin = new BlazorPlugin();
      pluginContext = TestHelper.getFakePluginContext();
      pluginContext.config.set(BlazorConfigInfo.webAppName, "ut");
      pluginContext.config.set(BlazorConfigInfo.appServicePlanName, "ut");
      pluginContext.config.set(BlazorConfigInfo.projectFilePath, "./ut");

      sinon.stub(core, "isVsCallingCli").returns(true);
      sinon.stub(dirWalk, "forEachFileAndDir").resolves(undefined);
      sinon.stub(execute, "execute").resolves("");
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readFile").resolves("" as any);
      sinon.stub(AzureClientFactory, "getWebSiteManagementClient").returns({
        webApps: {
          listPublishingCredentials: () => TestHelper.publishingProfile,
        },
      } as any);
      sinon.stub(axios, "post").resolves({ status: 200 } as any);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const result = await plugin.deploy(pluginContext);

      chai.assert.isTrue(result.isOk());
    });
  });
});
