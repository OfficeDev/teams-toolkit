// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as tools from "../../../../src/common/tools";
import * as utils from "../../../../src/component/code/utils";
import { TestAzureAccountProvider } from "../../util/azureAccountMock";
import { TestLogProvider } from "../../util/logProviderMock";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { NpmBuildDriver } from "../../../../src/component/driver/script/npmBuildDriver";
import { assert } from "chai";

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
      workingDirectory: "./",
      args: "build",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox.stub(utils, "execute").resolves();
    const res = await driver.run(args, context);
    chai.assert.equal(res.isOk(), true);
  });

  it("Dotnet build error", async () => {
    const driver = new NpmBuildDriver();
    const args = {
      workingDirectory: "./",
      args: "build",
      env: { a: "HELLO" },
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
    } as DriverContext;
    sandbox.stub(utils, "execute").throws(new Error("error"));
    const res = await driver.run(args, context);
    assert.equal(res.isErr(), true);
  });
});
