// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as tools from "../../../../../src/common/tools";
import { DeployArgs } from "../../../../../src/component/driver/interface/buildAndDeployArgs";
import { TestAzureAccountProvider } from "../../../util/azureAccountMock";
import { TestLogProvider } from "../../../util/logProviderMock";
import * as appService from "@azure/arm-appservice";
import * as Models from "@azure/arm-appservice/src/models";
import * as fileOpt from "../../../../../src/component/utils/fileOperation";
import { AzureDeployDriver } from "../../../../../src/component/driver/deploy/azure/azureDeployDriver";
import { expect } from "chai";
import * as fs from "fs-extra";
import { AzureFunctionDeployDriver } from "../../../../../src/component/driver/deploy/azure/azureFunctionDeployDriver";
import { MyTokenCredential } from "../../../../plugins/solution/util";
import { DriverContext } from "../../../../../src/component/driver/interface/commonArgs";

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
      workingDirectory: "./",
      distributionPath: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(client.webApps, "restart").resolves();
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
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
    expect(res.unwrapOr(new Map([["a", "b"]])).size).to.equal(0);
  });

  it("deploy restart error!", async () => {
    const deploy = new AzureFunctionDeployDriver();
    const args = {
      workingDirectory: "./",
      distributionPath: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(client.webApps, "restart").rejects();
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
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
    expect(res.isErr()).to.equal(true);
  });

  it("deploy restart throws", async () => {
    const deploy = new AzureFunctionDeployDriver();
    const args = {
      workingDirectory: "./",
      distributionPath: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(client.webApps, "restart").throws(new Error("test"));
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
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
    expect(res.isErr()).to.equal(true);
  });

  it("Zip deploy throws when upload", async () => {
    const deploy = new AzureFunctionDeployDriver();
    const args = {
      workingDirectory: "./",
      distributionPath: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(client.webApps, "restart").throws(new Error("test"));
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(fs, "readFileSync").resolves("test");
    // mock klaw
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "post").resolves({
      status: 403,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    const res = await deploy.run(args, context);
    expect(res.isErr()).to.equal(true);
  });

  it("Check deploy status error", async () => {
    const deploy = new AzureFunctionDeployDriver();
    const args = {
      workingDirectory: "./",
      distributionPath: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(client.webApps, "restart").throws(new Error("test"));
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
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
      status: 403,
    });
    const res = await deploy.run(args, context);
    expect(res.isErr()).to.equal(true);
  });

  it("Check deploy throws", async () => {
    const deploy = new AzureFunctionDeployDriver();
    const args = {
      workingDirectory: "./",
      distributionPath: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(client.webApps, "restart").throws(new Error("test"));
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
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
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "get").throws(new Error("test"));

    const res = await deploy.run(args, context);
    expect(res.isErr()).to.equal(true);
  });
});
