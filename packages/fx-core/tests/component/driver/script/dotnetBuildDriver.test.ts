// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as tools from "../../../../src/common/tools";
import * as utils from "../../../../src/component/code/utils";
import { DotnetBuildDriver } from "../../../../src/component/driver/script/dotnetBuildDriver";
import { TestAzureAccountProvider } from "../../util/azureAccountMock";
import { TestLogProvider } from "../../util/logProviderMock";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { assert } from "chai";
import { MockUserInteraction } from "../../../core/utils";
import { err, ok, UserError } from "@microsoft/teamsfx-api";

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
      workingDirectory: "./",
      args: "build",
      execPath: "/usr/local/bin",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      ui: new MockUserInteraction(),
      logProvider: new TestLogProvider(),
      projectPath: "./",
    } as DriverContext;
    sandbox.stub(utils, "executeCommand").resolves(ok(["", {}]));
    const res = await driver.run(args, context);
    chai.expect(res.unwrapOr(new Map([["a", "b"]])).size).to.equal(0);
  });

  it("Dotnet build with summary happy path", async () => {
    const driver = new DotnetBuildDriver();
    const args = {
      workingDirectory: "./",
      args: "build",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      ui: new MockUserInteraction(),
      logProvider: new TestLogProvider(),
      projectPath: "./",
    } as DriverContext;
    sandbox.stub(utils, "executeCommand").resolves(ok(["", {}]));
    const res = await driver.execute(args, context);
    chai.expect(res.result.unwrapOr(new Map([["a", "b"]])).size).to.equal(0);
    // console.log(res.summaries);
  });

  it("Dotnet build error", async () => {
    const driver = new DotnetBuildDriver();
    const args = {
      workingDirectory: "./",
      args: "build",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      projectPath: "./",
    } as DriverContext;
    sandbox.stub(utils, "executeCommand").resolves(err(new UserError({})));
    const res = await driver.run(args, context);
    assert.equal(res.isErr(), true);
  });
});
