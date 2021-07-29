// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as spies from "chai-spies";
import * as sinon from "sinon";
import * as funcUtils from "../utils/funcTool";
import { DepsChecker, IDepsAdapter } from "../../../../src/debug/depsChecker/checker";
import { TestAdapter } from "../adapters/testAdapter";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { FuncToolChecker } from "../../../../src/debug/depsChecker/funcToolChecker";
import * as path from "path";
import * as os from "os";
import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import { isWindows, isLinux } from "../../../../src/debug/depsChecker/common";

chai.use(spies);
const expect = chai.expect;
const spy = chai.spy;
const assert = chai.assert;
const sandbox = chai.spy.sandbox();

function createTestChecker(
  hasTeamsfxBackend: boolean,
  clickCancel = false,
  dotnetCheckerEnabled = true,
  funcToolCheckerEnabled = true,
  nodeCheckerEnabled = true
): [DepsChecker, FuncToolChecker, IDepsAdapter] {
  const testAdapter = new TestAdapter(
    hasTeamsfxBackend,
    clickCancel,
    dotnetCheckerEnabled,
    funcToolCheckerEnabled,
    nodeCheckerEnabled
  );
  const telemetry = new TestTelemetry();
  const funcToolChecker = new FuncToolChecker(testAdapter, logger, telemetry);
  const depsChecker = new DepsChecker(logger, testAdapter, [funcToolChecker]);
  return [depsChecker, funcToolChecker, testAdapter];
}

suite("FuncToolChecker E2E Test", async () => {
  setup(async function (this: Mocha.Context) {
    await funcUtils.cleanup();
    sandbox.restore();
    console.error("cleanup portable func and sandbox");
  });

  test("not install + special character dir", async function (this: Mocha.Context) {
    if ((await funcUtils.isFuncCoreToolsInstalled()) || isLinux()) {
      this.skip();
    }

    const [depsChecker, funcToolChecker, ,] = createTestChecker(true);
    sandbox.on(funcToolChecker, "getDefaultInstallPath", () =>
      path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "func", "Aarón García", "for test")
    );

    const shouldContinue = await depsChecker.resolve();

    expect(shouldContinue).to.be.equal(true);
    assert.isTrue(
      /node "[^"]*"$/g.test(await funcToolChecker.getFuncCommand()),
      `should use portable func, and func command = ${await funcToolChecker.getFuncCommand()}`
    );
    await assertFuncStart(funcToolChecker);
  });

  test("not install + throw error when installing", async function (this: Mocha.Context) {
    if ((await funcUtils.isFuncCoreToolsInstalled()) || isLinux()) {
      this.skip();
    }

    // first: throw timeout error
    const [depsChecker, funcToolChecker, testAdapter] = createTestChecker(true);
    sandbox.on(testAdapter, "displayLearnMore");
    sandbox.on(funcToolChecker, "doInstallPortableFunc", async () =>
      console.log("spy on doInstallPortableFunc")
    );

    const shouldContinueFirst = await depsChecker.resolve();

    assert.equal(shouldContinueFirst, false);
    expect(testAdapter.displayLearnMore).to.be.called.exactly(1);

    // second: still works well
    sandbox.restore(testAdapter, "displayLearnMore");
    sandbox.restore(funcToolChecker, "doInstallPortableFunc");
    sandbox.on(testAdapter, "displayLearnMore");

    const shouldContinueSecond = await depsChecker.resolve();

    expect(shouldContinueSecond).to.be.equal(true, "second run, should success");
    expect(testAdapter.displayLearnMore).to.be.called.exactly(0);
    await assertFuncStart(funcToolChecker);
  });

  test("not install + linux + user cancel", async function (this: Mocha.Context) {
    if ((await funcUtils.isFuncCoreToolsInstalled()) || !isLinux()) {
      this.skip();
    }
    const [depsChecker, funcToolChecker, ,] = createTestChecker(true, true);

    const shouldContinue = await depsChecker.resolve();

    expect(shouldContinue).to.be.equal(false);
    expect(await funcToolChecker.getFuncCommand()).to.be.equal("npx azure-functions-core-tools@3");
  });

  test("not install + feature flag", async function (this: Mocha.Context) {
    if (await funcUtils.isFuncCoreToolsInstalled()) {
      this.skip();
    }
    const [depsChecker, funcToolChecker, ,] = createTestChecker(true, false, true, false);

    const shouldContinue = await depsChecker.resolve();

    expect(shouldContinue).to.be.equal(true);
    expect(await funcToolChecker.getFuncCommand()).to.be.equal("npx azure-functions-core-tools@3");
  });

  test("not install + not backend", async function (this: Mocha.Context) {
    if (await funcUtils.isFuncCoreToolsInstalled()) {
      this.skip();
    }
    const [depsChecker, funcToolChecker, ,] = createTestChecker(false);

    const shouldContinue = await depsChecker.resolve();

    expect(shouldContinue).to.be.equal(true);
    expect(await funcToolChecker.getFuncCommand()).to.be.equal("npx azure-functions-core-tools@3");
  });

  test("already install + linux", async function (this: Mocha.Context) {
    if (!(await funcUtils.isFuncCoreToolsInstalled()) || !isLinux()) {
      this.skip();
    }

    const [depsChecker, funcToolChecker, testAdapter] = createTestChecker(true);
    sandbox.on(testAdapter, "displayLearnMore");
    const shouldContinue = await depsChecker.resolve();

    expect(shouldContinue).to.be.equal(true);
    expect(testAdapter.displayLearnMore).to.be.called.exactly(0);
    expect(await funcToolChecker.getFuncCommand()).to.be.equal("func", `should use global func`);
    await assertFuncStart(funcToolChecker);
  });

  test("already install + old func version(v2)", async function (this: Mocha.Context) {
    const funcVersion = await funcUtils.getFuncCoreToolsVersion();
    if (isLinux()) {
      this.skip();
    }
    if (funcVersion == null || (await funcUtils.isFuncCoreToolsInstalled())) {
      this.skip();
    }

    const [depsChecker, funcToolChecker, ,] = createTestChecker(true);
    const shouldContinue = await depsChecker.resolve();

    expect(shouldContinue).to.be.equal(true);
    assert.isTrue(
      /node "[^"]*"$/g.test(await funcToolChecker.getFuncCommand()),
      `should use portable func`
    );
    await assertFuncStart(funcToolChecker);
  });
});

async function assertFuncStart(funcToolChecker: FuncToolChecker): Promise<void> {
  const funcExecCommand = await funcToolChecker.getFuncCommand();
  const funcStartResult: cpUtils.ICommandResult = await cpUtils.tryExecuteCommand(
    undefined,
    logger,
    { shell: true },
    `${funcExecCommand} start`
  );
  // func start can work: "Unable to find project root. Expecting to find one of host.json, local.settings.json in project root."
  expect(funcStartResult.cmdOutputIncludingStderr).to.includes(
    "Unable to find project root",
    `func start should return error message that contains "Unable to find project root", but actual output: "${funcStartResult.cmdOutputIncludingStderr}"`
  );
}
