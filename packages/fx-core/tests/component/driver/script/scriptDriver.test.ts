// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as tools from "../../../../src/common/tools";
import { TestAzureAccountProvider } from "../../util/azureAccountMock";
import { TestLogProvider } from "../../util/logProviderMock";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import { scriptDriver } from "../../../../src/component/driver/script/scriptDriver";
import { assert } from "chai";
import { MockUserInteraction } from "../../../core/utils";
import { err, UserError } from "@microsoft/teamsfx-api";
import fs from "fs-extra";

describe("Script Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });
  it("execute success", async () => {
    const args = {
      workingDirectory: "./",
      shell: "cmd",
      run: "::set-output KEY=VALUE",
      redirectTo: "./log",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    const res = await scriptDriver.execute(args, context);
    assert.isTrue(res.result.isOk());
    if (res.result.isOk()) {
      const output = res.result.value;
      assert.equal(output.get("KEY"), "VALUE");
    }
  });
  it("execCallback with Error", async () => {
    sandbox.stub(fs, "appendFile").resolves();
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    process.env.SECRET_MY = "VAL";
    await scriptDriver.execCallback(
      (a: any) => {},
      new Error("error"),
      "SECRET_MY=VAL",
      "SECRET_MY=VAL",
      "",
      context,
      "",
      "./log"
    );
  });
  it("execCallback without Error", async () => {
    sandbox.stub(fs, "appendFile").resolves();
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    process.env.SECRET_MY = "VAL";
    await scriptDriver.execCallback(
      (a: any) => {},
      null,
      "SECRET_MY=VAL",
      "SECRET_MY=VAL",
      "",
      context,
      "",
      "./log"
    );
  });
  it("execute failed, mock executeCommand fail", async () => {
    sandbox.stub(scriptDriver, "executeCommand").resolves(err(new UserError({})));
    const args = {
      workingDirectory: "./",
      run: "::set-output KEY=VALUE",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    const res = await scriptDriver.execute(args, context);
    assert.isTrue(res.result.isErr());
  });
  it("executeCommand: set output", async () => {
    const args = {
      workingDirectory: "./",
      run: "::set-output KEY=VALUE",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    const res = await scriptDriver.executeCommand(args, context);
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      const output = res.value[1];
      assert.deepEqual(output, { KEY: "VALUE" });
    }
  });
  it("executeCommand failed", async () => {
    const args = {
      workingDirectory: "./",
      run: "abc",
      shell: "cmd",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    const res = await scriptDriver.executeCommand(args, context);
    assert.isTrue(res.isErr());
  });
});
