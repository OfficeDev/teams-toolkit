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
import { err, ok, UserError } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as child_process from "child_process";
import * as utils from "../../../../src/component/code/utils";
import * as os from "os";

describe("Script Driver test", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "true" }, { clear: true });
    sandbox.stub(tools, "waitSeconds").resolves();
  });
  afterEach(async () => {
    sandbox.restore();
    mockedEnvRestore();
    if (await fs.pathExists("./log")) {
      await fs.remove("./log");
    }
  });
  it("execute success set-output", async () => {
    const args = {
      workingDirectory: "./",
      run: "echo '::set-output MY_KEY=MY_VALUE'",
      redirectTo: "./log",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    context.ui!.runCommand = undefined;
    const res = await scriptDriver.execute(args, context);
    assert.isTrue(res.result.isOk());
    if (res.result.isOk()) {
      const output = res.result.value;
      assert.equal(output.get("MY_KEY"), "MY_VALUE");
    }
  });
  it("execute success exec", async () => {
    const args = {
      workingDirectory: "./",
      run: "echo 123",
      redirectTo: "./log",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    context.ui!.runCommand = undefined;
    sandbox.stub(child_process, "exec").resolves();
    const res = await scriptDriver.execute(args, context);
    if (res.result.isErr()) {
      console.log(res.result.error);
    }
    assert.isTrue(res.result.isOk());
  });
  it("execute failed, mock executeCommand fail", async () => {
    sandbox.stub(utils, "executeCommand").resolves(err(new UserError({})));
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
      run: "echo '::set-output KEY=VALUE'",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    const res = await utils.executeCommand(
      args.run,
      context.projectPath,
      context.logProvider,
      context.ui,
      args.workingDirectory
    );
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      const output = res.value[1];
      assert.deepEqual(output, { KEY: "VALUE" });
    }
  });
  it("executeCommand: set output", async () => {
    const args = {
      workingDirectory: "./",
      run: "echo '::set-output KEY=VALUE'",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    const res = await utils.executeCommand(
      args.run,
      context.projectPath,
      context.logProvider,
      context.ui,
      args.workingDirectory
    );
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      const output = res.value[1];
      assert.deepEqual(output, { KEY: "VALUE" });
    }
  });
  it("executeCommand: error", async () => {
    const args = {
      workingDirectory: "./",
      run: "abc",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    const res = await utils.executeCommand(
      args.run,
      context.projectPath,
      context.logProvider,
      context.ui,
      args.workingDirectory
    );
    assert.isTrue(res.isErr());
  });
  // it("execute command ui.runCommand()", async () => {
  //   const args = {
  //     workingDirectory: "./",
  //     shell: "cmd",
  //     run: "echo 111",
  //     redirectTo: "./log",
  //   };
  //   const context = {
  //     azureAccountProvider: new TestAzureAccountProvider(),
  //     logProvider: new TestLogProvider(),
  //     ui: new MockUserInteraction(),
  //     projectPath: "./",
  //   } as DriverContext;
  //   sandbox.stub(context.ui!, "runCommand").resolves(ok(""));
  //   const res = await scriptDriver.execute(args, context);
  //   assert.isTrue(res.result.isOk());
  // });
});
