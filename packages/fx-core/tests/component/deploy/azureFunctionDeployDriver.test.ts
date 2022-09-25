// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as tools from "../../../src/common/tools";
import { DeployArgs, DriverContext } from "../../../src/component/interface/buildAndDeployArgs";
import { FakeTokenCredentials, TestAzureAccountProvider } from "../util/azureAccountMock";
import { TestLogProvider } from "../util/logProviderMock";
import * as appService from "@azure/arm-appservice";
import * as Models from "@azure/arm-appservice/src/models";
import * as fileOpt from "../../../src/component/utils/fileOperation";
import { AzureDeployDriver } from "../../../src/component/deploy/azureDeployDriver";
import { expect, use as chaiUse } from "chai";
import fs = require("fs-extra");
import chaiAsPromised = require("chai-as-promised");
import { AzureFunctionDeployDriver } from "../../../src/component/deploy/azureFunctionDeployDriver";
chaiUse(chaiAsPromised);

describe("Azure Function Deploy Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("deploy happy path", async () => {
    const deploy = new AzureFunctionDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    const fake = new FakeTokenCredentials("x", "y");
    sandbox.stub(context.azureAccountProvider, "getAccountCredentialAsync").resolves(fake);
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(fake, "z");
    sandbox.stub(client.webApps, "restart").resolves({
      _response: {
        status: 200,
      },
    });
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "listPublishingCredentials").resolves({
      _response: { status: 200 },
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(fs, "readFileSync").resolves("test");
    // mock klaw
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    const res = await deploy.run(args, context);
    expect(res.size).to.equal(0);
  });

  it("deploy restart error!", async () => {
    const deploy = new AzureFunctionDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    const fake = new FakeTokenCredentials("x", "y");
    sandbox.stub(context.azureAccountProvider, "getAccountCredentialAsync").resolves(fake);
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(fake, "z");
    sandbox.stub(client.webApps, "restart").resolves({
      _response: {
        status: 500,
      },
    });
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "listPublishingCredentials").resolves({
      _response: { status: 200 },
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(fs, "readFileSync").resolves("test");
    // mock klaw
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    await expect(deploy.run(args, context)).to.be.rejectedWith("Failed to restart web app.");
  });

  it("deploy restart throws", async () => {
    const deploy = new AzureFunctionDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    const fake = new FakeTokenCredentials("x", "y");
    sandbox.stub(context.azureAccountProvider, "getAccountCredentialAsync").resolves(fake);
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(fake, "z");
    sandbox.stub(client.webApps, "restart").throws(new Error("test"));
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "listPublishingCredentials").resolves({
      _response: { status: 200 },
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(fs, "readFileSync").resolves("test");
    // mock klaw
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    await expect(deploy.run(args, context)).to.be.rejectedWith("Failed to restart web app.");
  });
});
