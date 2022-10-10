// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as tools from "../../../src/common/tools";
import * as utils from "../../../src/component/code/utils";
import { TestAzureAccountProvider } from "../util/azureAccountMock";
import { TestLogProvider } from "../util/logProviderMock";
import { DriverContext } from "../../../src/component/interface/commonArgs";
import chaiAsPromised = require("chai-as-promised");
import { NpmBuildDriver } from "../../../src/component/deploy/npmBuildDriver";
chai.use(chaiAsPromised);

describe("NPM Build Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("NPM build happy path", async () => {
    const driver = new NpmBuildDriver();
    const args = {
      src: "./",
      buildCommand: "build",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox.stub(utils, "execute").resolves();
    const res = await driver.run(args, context);
    chai.expect(res.size).to.equal(0);
  });

  it("Dotnet build error", async () => {
    const driver = new NpmBuildDriver();
    const args = {
      src: "./",
      buildCommand: "build",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox.stub(utils, "execute").throws(new Error("error"));
    await chai
      .expect(driver.run(args, context))
      .to.be.rejectedWith("Please run failed command 'npm build' in the folder: './'.");
  });
});
