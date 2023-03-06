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
      distributionPath: `./tmp`,
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
});
