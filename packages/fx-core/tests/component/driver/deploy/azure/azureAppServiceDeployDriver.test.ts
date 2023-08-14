// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author xzf0587 <zhaofengxu@microsoft.com>
 */
import "mocha";
import * as sinon from "sinon";
import * as tools from "../../../../../src/common/tools";
import { DeployArgs } from "../../../../../src/component/driver/interface/buildAndDeployArgs";
import { TestAzureAccountProvider } from "../../../util/azureAccountMock";
import { TestLogProvider } from "../../../util/logProviderMock";
import * as appService from "@azure/arm-appservice";
import * as Models from "@azure/arm-appservice/src/models";
import * as fileOpt from "../../../../../src/component/utils/fileOperation";
import { AzureDeployImpl } from "../../../../../src/component/driver/deploy/azure/impl/azureDeployImpl";
import { expect, assert } from "chai";
import * as fs from "fs-extra";
import { AzureAppServiceDeployDriver } from "../../../../../src/component/driver/deploy/azure/azureAppServiceDeployDriver";
import { DeployConstant } from "../../../../../src/component/constant/deployConstant";
import { DriverContext } from "../../../../../src/component/driver/interface/commonArgs";
import { MyTokenCredential } from "../../../../plugins/solution/util";
import { MockTelemetryReporter, MockUserInteraction } from "../../../../core/utils";
import * as os from "os";
import * as path from "path";
import * as uuid from "uuid";
import { IProgressHandler } from "@microsoft/teamsfx-api";

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
    await fs.writeFile(path.join(sysTmp, "ignore"), "ignore", {
      encoding: "utf8",
      flag: "a",
    });
    const args = {
      workingDirectory: sysTmp,
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
      outputZipFile: ".deployment/deployment.zip",
    } as DeployArgs;
    const progressHandler: IProgressHandler = {
      start: async (detail?: string): Promise<void> => {},
      next: async (detail?: string): Promise<void> => {},
      end: async (): Promise<void> => {},
    };
    const ui = new MockUserInteraction();
    const progressNextCaller = sandbox.stub(progressHandler, "next").resolves();

    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: ui,
      telemetryReporter: new MockTelemetryReporter(),
      progressBar: progressHandler,
    } as any;
    const credential = new MyTokenCredential();
    sandbox.stub(credential, "getToken").resolves(undefined);
    sandbox.stub(context.azureAccountProvider, "getIdentityCredentialAsync").resolves(credential);
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(credential, "z");
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(fs, "readFileSync").resolves("test");
    // mock klaw
    // sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
      data: {
        status: 4,
        message: "success",
        received_time: 123,
        start_time: 111,
        end_time: 123,
        last_success_end_time: 100,
        complete: true,
        active: 1,
        is_readonly: true,
        site_name: "new_name",
      },
    });
    sandbox.stub(client.webApps, "restart").resolves();
    const res = await deploy.run(args, context);
    expect(res.unwrapOr(new Map([["a", "a"]])).size).to.equal(0);
    // progress bar have 6 steps
    expect(progressNextCaller.callCount).to.equal(1);
    const rex = await deploy.execute(args, context);
    expect(rex.result.unwrapOr(new Map([["a", "a"]])).size).to.equal(0);
  });

  it("deploy happy path with response data is empty", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const fh = await fs.open(path.join(sysTmp, folder, "test.txt"), "a");
    await fs.close(fh);
    await fs.writeFile(path.join(sysTmp, "ignore"), "ignore", {
      encoding: "utf8",
      flag: "a",
    });
    const args = {
      workingDirectory: sysTmp,
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
      outputZipFile: ".deployment/deployment.zip",
    } as DeployArgs;
    const progressHandler: IProgressHandler = {
      start: async (detail?: string): Promise<void> => {},
      next: async (detail?: string): Promise<void> => {},
      end: async (): Promise<void> => {},
    };
    const ui = new MockUserInteraction();
    const progressNextCaller = sandbox.stub(progressHandler, "next").resolves();

    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: ui,
      telemetryReporter: new MockTelemetryReporter(),
      progressBar: progressHandler,
    } as any;
    const credential = new MyTokenCredential();
    sandbox.stub(credential, "getToken").resolves(undefined);
    sandbox.stub(context.azureAccountProvider, "getIdentityCredentialAsync").resolves(credential);
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(credential, "z");
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(fs, "readFileSync").resolves("test");
    // mock klaw
    // sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
      data: {},
    });
    sandbox.stub(client.webApps, "restart").resolves();
    const res = await deploy.run(args, context);
    expect(res.unwrapOr(new Map([["a", "a"]])).size).to.equal(0);
    // progress bar have 6 steps
    expect(progressNextCaller.callCount).to.equal(1);
    const rex = await deploy.execute(args, context);
    expect(rex.result.unwrapOr(new Map([["a", "a"]])).size).to.equal(0);
  });

  it("resource id error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as any;
    // await deploy.run(args, context);
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("missing resource id", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
    } as any;
    // await deploy.run(args, context);
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("deploy with ignore file not exists", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      telemetryReporter: new MockTelemetryReporter(),
    } as any;
    sandbox
      .stub(context.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());

    const client = new appService.WebSiteManagementClient(new MyTokenCredential(), "z");
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
      publishingUserName: "test-username",
      publishingPassword: "test-password",
    } as Models.WebAppsListPublishingCredentialsResponse);
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
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
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as any;
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
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").throws(new Error("test"));
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("should thrown when deploy remote 500 error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as any;
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
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").throws({
      response: {
        status: 503,
      },
      isAxiosError: true,
    });
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("should thrown when deploy remote 400 error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: sysTmp,
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as any;
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
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").throws({
      response: {
        status: 404,
      },
      isAxiosError: true,
    });
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    const res = await deploy.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("working dir not exists", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const args = {
      workingDirectory: "/aaaa",
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as any;
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
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
      dryRun: true,
    } as DeployArgs;

    const progressHandler: IProgressHandler = {
      start: async (detail?: string): Promise<void> => {},
      next: async (detail?: string): Promise<void> => {},
      end: async (): Promise<void> => {},
    };
    const ui = new MockUserInteraction();
    const progressNextCaller = sandbox.stub(progressHandler, "next").resolves();

    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: ui,
      progressBar: progressHandler,
    } as any;
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
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    sandbox.stub(client.webApps, "restart").resolves();
    const res = await deploy.execute(args, context);
    assert.equal(res.result.isOk(), true);
    const tmpFile = path.join(sysTmp, "./.deployment/deployment.zip");
    assert.equal(
      res.summaries[0],
      `Deployment preparations are completed. You can find the package in \`${tmpFile}\``
    );
    // dry run will have only one progress step
    assert.equal(progressNextCaller.callCount, 1);
  });

  it("list credential error", async () => {
    const deploy = new AzureAppServiceDeployDriver();
    const fh = await fs.open(path.join(sysTmp, folder, "test.txt"), "a");
    await fs.close(fh);
    await fs.writeFile(path.join(sysTmp, folder, "ignore"), "ignore", {
      encoding: "utf8",
      flag: "a",
    });
    const args = {
      workingDirectory: sysTmp,
      artifactFolder: `./${folder}`,
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-aa11aaaa1aa1/resourceGroups/hoho-rg/providers/Microsoft.Web/sites/some-server-farm",
    } as DeployArgs;
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as any;
    const credential = new MyTokenCredential();
    credential.getToken = async () => {
      return null;
    };
    sandbox.stub(context.azureAccountProvider, "getIdentityCredentialAsync").resolves(credential);
    // ignore file
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").callsFake((file) => {
      if (file === "ignore") {
        return Promise.resolve(Buffer.from("node_modules"));
      }
      throw new Error("not found");
    });
    const client = new appService.WebSiteManagementClient(credential, "z");
    sandbox.stub(appService, "WebSiteManagementClient").returns(client);
    sandbox
      .stub(client.webApps, "beginListPublishingCredentialsAndWait")
      .throws(new Error("error"));
    sandbox.stub(fs, "readFileSync").resolves("test");
    // mock klaw
    // sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(fileOpt, "forEachFileAndDir").resolves(undefined);
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "post").resolves({
      status: 200,
      headers: {
        location: "/api/123",
      },
    });
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves({
      status: 200,
    });
    sandbox.stub(client.webApps, "restart").resolves();
    const res = await deploy.execute(args, context);
    assert.equal(res.result.isOk(), false);
  });
});
