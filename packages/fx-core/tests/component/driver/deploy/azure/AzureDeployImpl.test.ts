// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Siglud <siglud@gmail.com>
 */

import "mocha";
import { DeployArgs } from "../../../../../src/component/driver/interface/buildAndDeployArgs";
import { TestAzureAccountProvider } from "../../../util/azureAccountMock";
import { TestLogProvider } from "../../../util/logProviderMock";
import { MockUserInteraction } from "../../../../core/utils";
import { DriverContext } from "../../../../../src/component/driver/interface/commonArgs";
import { AzureZipDeployImpl } from "../../../../../src/component/driver/deploy/azure/impl/AzureZipDeployImpl";
import * as tools from "../../../../../src/common/tools";
import * as sinon from "sinon";
import { AzureDeployImpl } from "../../../../../src/component/driver/deploy/azure/impl/azureDeployImpl";
import {
  CheckDeploymentStatusTimeoutError,
  GetPublishingCredentialsError,
} from "../../../../../src/error/deploy";
import { AzureAppServiceDeployDriver } from "../../../../../src/component/driver/deploy/azure/azureAppServiceDeployDriver";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { MyTokenCredential } from "../../../../plugins/solution/util";
chai.use(chaiAsPromised);
import * as appService from "@azure/arm-appservice";
import { RestError } from "@azure/storage-blob";
import {
  WebAppsListPublishingCredentialsResponse,
  WebSiteManagementClient,
} from "@azure/arm-appservice";

describe("AzureDeployImpl zip deploy acceleration", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(async () => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("zip deploy need acceleration", async () => {
    const args = {
      workingDirectory: "./",
      artifactFolder: `./tmp`,
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
    const deploy = new AzureZipDeployImpl(args, context, "", "", [], []);
    sandbox.stub(deploy, "zipDeploy").resolves(5_000_000);
    await deploy.run();
  });

  it("checkDeployStatus empty response", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves(undefined);
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    await chai
      .expect(impl.checkDeployStatus("", config))
      .to.be.rejectedWith(CheckDeploymentStatusTimeoutError);
  });

  it("createAzureDeployConfig GetPublishingCredentialsError", async () => {
    sandbox.stub(AzureDeployImpl.AXIOS_INSTANCE, "get").resolves(undefined);
    const args = {
      workingDirectory: "/",
      artifactFolder: "/",
      ignoreFile: "./ignore",
      resourceId:
        "/subscriptions/e24d88be-bbbb-1234-ba25-11111111111/resourceGroups/hoho-rg/providers/Microsoft.Web/sites",
    } as DeployArgs;
    const context = {
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    const impl = new AzureZipDeployImpl(
      args,
      context,
      "Azure App Service",
      "https://aka.ms/teamsfx-actions/azure-app-service-deploy",
      ["driver.deploy.azureAppServiceDeployDetailSummary"],
      ["driver.deploy.notice.deployDryRunComplete"]
    );
    const webApps = {
      beginListPublishingCredentialsAndWait: async function (
        resourceGroupName: string,
        name: string
      ): Promise<WebAppsListPublishingCredentialsResponse> {
        throw new RestError("test message", "111", 500);
      },
    };
    const mockWebSiteManagementClient = new WebSiteManagementClient(new MyTokenCredential(), "sub");
    mockWebSiteManagementClient.webApps = webApps as any;
    sandbox.stub(appService, "WebSiteManagementClient").returns(mockWebSiteManagementClient);
    await chai
      .expect(
        impl.createAzureDeployConfig(
          {
            subscriptionId: "e24d88be-bbbb-1234-ba25-11111111111",
            resourceGroupName: "mockGroupName",
            instanceId: "mockAppName",
          },
          new MyTokenCredential()
        )
      )
      .to.be.rejectedWith(GetPublishingCredentialsError);
  });
});
