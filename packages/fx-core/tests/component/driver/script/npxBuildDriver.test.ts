// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { assert } from "chai";
import * as sinon from "sinon";

import * as tools from "../../../../src/common/tools";
import * as utils from "../../../../src/component/code/utils";
import { TestAzureAccountProvider } from "../../util/azureAccountMock";
import { TestLogProvider } from "../../util/logProviderMock";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { NpxBuildDriver } from "../../../../src/component/driver/script/npxBuildDriver";
import { MockUserInteraction } from "../../../core/utils";

describe("NPX Build Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("NPX build happy path", async () => {
    const driver = new NpxBuildDriver();
    const args = {
      workingDirectory: "./",
      args: "build",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
    } as DriverContext;
    sandbox.stub(utils, "execute").resolves();
    const res = await driver.run(args, context);
    assert.equal(res.isOk(), true);
  });

  it("NPX build error", async () => {
    const driver = new NpxBuildDriver();
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
