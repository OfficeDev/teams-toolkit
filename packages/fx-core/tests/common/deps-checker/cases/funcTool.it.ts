// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import chai from "chai";
import spies from "chai-spies";
import * as funcUtils from "../utils/funcTool";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { FuncToolChecker } from "../../../../src/common/deps-checker/internal/funcToolChecker";
import { DepsType } from "../../../../src/common/deps-checker/depsChecker";
import { CheckerFactory } from "../../../../src/common/deps-checker/checkerFactory";
import * as path from "path";
import * as os from "os";
import { cpUtils } from "../../../../src/common/deps-checker/util/cpUtils";
import { isLinux } from "../../../../src/common/deps-checker/util/system";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import "mocha";

chai.use(spies);
const expect = chai.expect;
const assert = chai.assert;
const sandbox = chai.spy.sandbox();

describe("FuncToolChecker E2E Test", async () => {
  beforeEach(async function () {
    await funcUtils.cleanup();
    sandbox.restore();
    console.error("cleanup portable func and sandbox");
  });

  it("not install + special character dir", async function () {
    if ((await funcUtils.isFuncCoreToolsInstalled()) || isLinux()) {
      this.skip();
    }

    const funcToolChecker = CheckerFactory.createChecker(
      DepsType.FuncCoreTools,
      logger,
      new TestTelemetry()
    ) as FuncToolChecker;
    sandbox.on(funcToolChecker, "getDefaultInstallPath", () =>
      path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "func", "Aarón García", "for test")
    );

    const shouldContinue = await funcToolChecker.resolve();

    expect(shouldContinue).to.be.equal(true);
    expect(await funcToolChecker.isInstalled()).to.be.equal(true);
    assert.isTrue(
      /node "[^"]*"$/g.test(await funcToolChecker.command()),
      `should use portable func, and func command = ${await funcToolChecker.command()}`
    );
    await assertFuncStart(funcToolChecker);
  });

  it("not install + throw error when installing", async function () {
    if ((await funcUtils.isFuncCoreToolsInstalled()) || isLinux()) {
      this.skip();
    }

    // first: throw timeout error
    const funcToolChecker = CheckerFactory.createChecker(
      DepsType.FuncCoreTools,
      logger,
      new TestTelemetry()
    ) as FuncToolChecker;
    sandbox.on(funcToolChecker, "doInstallPortableFunc", async () =>
      console.log("spy on doInstallPortableFunc")
    );

    const shouldContinue = await funcToolChecker.resolve();
    assert.isFalse(shouldContinue);
    assert.isFalse(await funcToolChecker.isInstalled());

    // second: still works well
    sandbox.restore(funcToolChecker, "doInstallPortableFunc");
    const shouldContinueRetry = await funcToolChecker.resolve();

    assert.isTrue(shouldContinueRetry);
    assert.isTrue(await funcToolChecker.isInstalled(), "second run, should success");
    await assertFuncStart(funcToolChecker);
  });

  it("not install + linux + user cancel", async function () {
    if ((await funcUtils.isFuncCoreToolsInstalled()) || !isLinux()) {
      this.skip();
    }
    const funcToolChecker = CheckerFactory.createChecker(
      DepsType.FuncCoreTools,
      logger,
      new TestTelemetry()
    ) as FuncToolChecker;
    const depsInfo = await funcToolChecker.getDepsInfo();

    expect(depsInfo.isLinuxSupported).to.be.equal(false);
    expect(await funcToolChecker.command()).to.be.equal("npx azure-functions-core-tools@3");
  });

  it("already install + linux", async function () {
    if (!(await funcUtils.isFuncCoreToolsInstalled()) || !isLinux()) {
      this.skip();
    }

    const funcToolChecker = CheckerFactory.createChecker(
      DepsType.FuncCoreTools,
      logger,
      new TestTelemetry()
    ) as FuncToolChecker;

    expect(funcToolChecker.isInstalled()).to.be.equal(true);
    expect(await funcToolChecker.command()).to.be.equal("func", `should use global func`);
    await assertFuncStart(funcToolChecker);
  });

  it("already install + old func version(v2)", async function () {
    const funcVersion = await funcUtils.getFuncCoreToolsVersion();
    if (isLinux()) {
      this.skip();
    }
    if (funcVersion == null || (await funcUtils.isFuncCoreToolsInstalled())) {
      this.skip();
    }

    const funcToolChecker = CheckerFactory.createChecker(
      DepsType.FuncCoreTools,
      logger,
      new TestTelemetry()
    ) as FuncToolChecker;
    const shouldContinue = await funcToolChecker.resolve();

    assert.isTrue(shouldContinue);
    expect(await funcToolChecker.isInstalled()).to.be.equal(true);
    assert.isTrue(
      /node "[^"]*"$/g.test(await funcToolChecker.command()),
      `should use portable func`
    );
    await assertFuncStart(funcToolChecker);
  });
});

async function assertFuncStart(funcToolChecker: FuncToolChecker): Promise<void> {
  const funcExecCommand = await funcToolChecker.command();
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
