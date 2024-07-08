// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import { err, ok, UserError } from "@microsoft/teamsfx-api";
import chai from "chai";
import * as tools from "../../../../src/common/utils";
import { NpxBuildDriver } from "../../../../src/component/driver/script/npxBuildDriver";
import * as utils from "../../../../src/component/driver/script/scriptDriver";
import { MockUserInteraction } from "../../../core/utils";
import { TestAzureAccountProvider } from "../../util/azureAccountMock";
import { TestLogProvider } from "../../util/logProviderMock";

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
      projectPath: "./",
    } as any;
    sandbox.stub(utils, "executeCommand").resolves(ok(["", {}]));
    const res = await driver.execute(args, context);
    assert.equal(res.result.isOk(), true);
    chai.assert.equal((await driver.execute(args, context)).result.isOk(), true);
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
      projectPath: "./",
    } as any;
    sandbox.stub(utils, "executeCommand").resolves(err(new UserError({})));
    const res = await driver.execute(args, context);
    assert.equal(res.result.isErr(), true);
  });
});
