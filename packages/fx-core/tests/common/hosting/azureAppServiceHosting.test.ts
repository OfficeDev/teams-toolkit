// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { BicepContext, ServiceType } from "../../../src/common/azure-hosting/interfaces";
import { ResourcePlugins } from "../../plugins/resource/util";
import { AzureHostingFactory } from "../../../src/common/azure-hosting/hostingFactory";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import { Platform, TokenProvider } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import * as lib from "../../../src/common/azure-hosting/utils";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { TokenResponse } from "adal-node";
import * as appService from "@azure/arm-appservice";

describe("azure app service hosting", () => {
  const context: BicepContext = {
    plugins: [
      ResourcePlugins.Aad,
      ResourcePlugins.Bot,
      ResourcePlugins.Identity,
      ResourcePlugins.LocalDebug,
    ],
    configs: ["node", "running-on-azure"],
    moduleNames: { [ServiceType.Functions]: "botFunction" },
    moduleAlias: "bot",
    pluginId: ResourcePlugins.Bot,
  };
  const pluginId = ResourcePlugins.Bot;

  class FakeTokenCredentials extends TokenCredentialsBase {
    public async getToken(): Promise<TokenResponse> {
      return {
        tokenType: "Bearer",
        expiresIn: Date.now(),
        expiresOn: new Date(),
        resource: "anything",
        accessToken: "anything",
      };
    }
  }

  describe("create bicep", () => {
    it("create bicep", async () => {
      const hosting = AzureHostingFactory.createHosting(ServiceType.AppService);
      const template = await hosting.generateBicep(context);

      chai.assert.exists(template.Configuration);
      chai.assert.deepEqual(template.Reference, hosting.reference);

      const expectedConfigModule = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "webAppConfigModule.bicep")),
        "utf-8"
      );
      chai.assert.equal(template.Configuration.Modules[hosting.hostType], expectedConfigModule);

      const expectedProvisionOrchestration = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "webAppProvisionOrchestration.bicep")),
        "utf-8"
      );
      chai.assert.equal(template.Provision.Orchestration, expectedProvisionOrchestration);

      const expectedConfigOrchestration = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "webAppConfigOrchestration.bicep")),
        "utf-8"
      );
      chai.assert.equal(template.Configuration.Orchestration, expectedConfigOrchestration);
    });
  });

  describe("update bicep", () => {
    it("update bicep", async () => {
      const hosting = AzureHostingFactory.createHosting(ServiceType.AppService);
      const template = await hosting.updateBicep(context);

      chai.assert.exists(template.Configuration);
      chai.assert.exists(template.Reference);

      const except = await fs.readFile(
        path.resolve(path.join(__dirname, "expectedBicep", "webAppConfigModule.bicep")),
        "utf-8"
      );
      chai.assert.equal(template.Configuration.Modules[hosting.hostType], except);
    });
  });

  describe("deploy", () => {
    it("deploy success", async () => {
      const hosting = AzureHostingFactory.createHosting(ServiceType.AppService);
      const tokenProvider = {} as TokenProvider;
      const fake = new FakeTokenCredentials("x", "y");
      const client = new appService.WebSiteManagementClient(fake, "z");

      sinon.stub(lib, "azureWebSiteDeploy").resolves(client);
      await hosting.deploy("", tokenProvider, Buffer.alloc(1, ""));
    });
  });
});
