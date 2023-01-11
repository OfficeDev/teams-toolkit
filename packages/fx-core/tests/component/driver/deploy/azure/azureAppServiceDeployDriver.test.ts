// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as sinon from "sinon";
import "mocha";
import { AzureAppServiceDeployDriver } from "../../../../../src/component/driver/deploy/azure/azureAppServiceDeployDriver";
import { DeployArgs } from "../../../../../src/component/driver/interface/buildAndDeployArgs";
import * as appService from "@azure/arm-appservice";
import * as tools from "../../../../../src/common/tools";
import { TestLogProvider } from "../../../util/logProviderMock";
import { expect, assert } from "chai";
import * as fs from "fs-extra";
import { TestAzureAccountProvider } from "../../../util/azureAccountMock";
import * as Models from "@azure/arm-appservice/src/models";
import { AzureDeployDriverImpl } from "../../../../../src/component/driver/deploy/azure/impl/azureDeployDriverImpl";
import { DeployConstant } from "../../../../../src/component/constant/deployConstant";
import * as fileOpt from "../../../../../src/component/utils/fileOperation";
import { DriverContext } from "../../../../../src/component/driver/interface/commonArgs";
import { MyTokenCredential } from "../../../../plugins/solution/util";
import { MockUserInteraction } from "../../../../core/utils";
import * as os from "os";
import * as path from "path";
import * as uuid from "uuid";
import { AzureZipDeployDriverImpl } from "../../../../../src/component/driver/deploy/azure/impl/AzureZipDeployDriverImpl";

describe("Azure App Service Deploy Driver test", () => {
  const sandbox = sinon.createSandbox();
  const sysTmp = os.tmpdir();
  const folder = uuid.v4();
  const testFolder = path.join(sysTmp, folder);

  before(async () => {
    await fs.mkdirs(testFolder);
  });

  after(async () => {
    fs.rmSync(testFolder, { recursive: true, force: true });
  });

  beforeEach(async () => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("deploy happy path", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const fh = await fs.open(path.join(sysTmp, folder, "test.txt"), "a");
    await fs.close(fh);
    await fs.writeFile(path.join(sysTmp, folder, "ignore"), "ignore", {
      encoding: "utf8",
      flag: "a",
    });
    const args = {
      workingDirectory: sysTmp,
      distributionPath: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
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
    // sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    sandbox.stub(client.webApps, "restart").resolves();
    const res = await deploy.run(args, context);
    expect(res.unwrapOr(new Map([["a", "a"]])).size).to.equal(0);
    const rex = await deploy.execute(args, context);
    expect(rex.result.unwrapOr(new Map([["a", "a"]])).size).to.equal(0);
  });

  it("resource id error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: "/",
      distributionPath: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    // await deploy.run(args, context);
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("missing resource id", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      distributionPath: `./${folder}`,
      ignoreFile: "./ignore",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
    } as DriverContext;
    // await deploy.run(args, context);
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("deploy with ignore file not exists", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      distributionPath: `./${folder}`,
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

    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    sandbox.stub(client.webApps, "restart").resolves();
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
    expect(res.unwrapOr(new Map([["a", "b"]])).size).to.equal(0);
  });

  it("zip deploy to azure error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      distributionPath: `./${folder}`,
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
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "post").throws(new Error("test"));
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("zip deploy need acceleration", async () => {
    const args = {
      workingDirectory: sysTmp,
      distributionPath: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    context.logProvider.info = async (msg: string | Array<any>) => {
      console.log(msg);
      return Promise.resolve(true);
    };
    const deploy = new AzureZipDeployDriverImpl(args, context, "", "", [], []);
    sandbox.stub(deploy, "zipDeploy").resolves(5_000_000);
    await deploy.run();
  });

  it("should thrown when deploy remote 500 error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      distributionPath: `./${folder}`,
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
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "post").throws({
      response: {
        status: 503,
      },
      isAxiosError: true,
    });
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("should thrown when deploy remote 400 error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      distributionPath: `./${folder}`,
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
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "post").throws({
      response: {
        status: 404,
      },
      isAxiosError: true,
    });
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("working dir not exists", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: "/aaaa",
      distributionPath: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("test dry run", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const fh = await fs.open(path.join(sysTmp, folder, "test.txt"), "a");
    await fs.close(fh);
    await fs.writeFile(path.join(sysTmp, folder, "ignore"), "ignore", {
      encoding: "utf8",
      flag: "a",
    });
    const args = {
      workingDirectory: sysTmp,
      distributionPath: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
      dryRun: true,
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
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
    // sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployDriverImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    sandbox.stub(client.webApps, "restart").resolves();
    const res = await deploy.execute(args, context);
    assert.equal(res.result.isOk(), true);
    assert.equal(res.summaries[0], "Preparations of deployment are complete. ");
  });
});
