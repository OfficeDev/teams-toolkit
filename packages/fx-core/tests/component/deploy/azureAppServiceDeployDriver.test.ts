// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as sinon from "sinon";
import "mocha";
import { AzureAppServiceDeployDriver } from "../../../src/component/deploy/azureAppServiceDeployDriver";
import { DeployArgs, DriverContext } from "../../../src/component/interface/buildAndDeployArgs";
import * as appService from "@azure/arm-appservice";
import * as tools from "../../../src/common/tools";
import { TestLogProvider } from "../util/logProviderMock";
import { use as chaiUse, expect } from "chai";
import fs from "fs-extra";
import chaiAsPromised from "chai-as-promised";
import { PrerequisiteError } from "../../../src/component/error/componentError";
import { TestAzureAccountProvider } from "../util/azureAccountMock";
import * as Models from "@azure/arm-appservice/src/models";
import { AzureDeployDriver } from "../../../src/component/deploy/azureDeployDriver";
import { DeployConstant } from "../../../src/component/constant/deployConstant";
import * as fileOpt from "../../../src/component/utils/fileOperation";
import { DeployExternalApiCallError } from "../../../src/component/error/deployError";
import { MyTokenCredential } from "../../plugins/solution/util";
chaiUse(chaiAsPromised);

describe("Azure App Service Deploy Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("deploy happy path", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/serverFarms/some-server-farm",
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
    expect(res.size).to.equal(0);
  });

  it("resource id error", () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/serverFarms",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
    } as DriverContext;
    // await deploy.run(args, context);
    expect(deploy.run(args, context)).to.be.rejectedWith(PrerequisiteError);
  });

  it("missing resource id", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
    } as DriverContext;
    // await deploy.run(args, context);
    await expect(deploy.run(args, context)).to.be.rejectedWith(PrerequisiteError);
  });

  it("deploy with ignore file not exists", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/serverFarms/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());

    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    // read deploy zip file error
    sandbox
      .stub(fs, "readFile")
      .withArgs(
        `./${DeployConstant.DEPLOYMENT_TMP_FOLDER}/${DeployConstant.DEPLOYMENT_ZIP_CACHE_FILE}`
      )
      .throws(new Error("test"));
    // mock klaw
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    const res = await deploy.run(args, context);
    expect(res.size).to.equal(0);
  });

  it("zip deploy to azure error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      src: "./",
      dist: "./",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/serverFarms/some-server-farm",
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
    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(fs, "readFileSync").resolves("test");
    // read deploy zip file error
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    // mock klaw
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "post").throws(new Error("test"));
    sandbox.stub(AzureDeployDriver.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    await expect(deploy.run(args, context)).to.be.rejectedWith(DeployExternalApiCallError);
  });
});
