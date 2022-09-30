// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as tools from "../../../src/common/tools";
import * as utils from "../../../src/component/code/utils";
import { DotnetBuildDriver } from "../../../src/component/deploy/dotnetBuildDriver";
import { TestAzureAccountProvider } from "../util/azureAccountMock";
import { TestLogProvider } from "../util/logProviderMock";
import { DriverContext } from "../../../src/component/interface/commonArgs";
import chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

describe("Dotnet Build Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Dotnet build happy path", async () => {
    const driver = new DotnetBuildDriver();
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
    const driver = new DotnetBuildDriver();
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
      .to.be.rejectedWith("Please run failed command 'dotnet build' in the folder: './'.");
  });
});
