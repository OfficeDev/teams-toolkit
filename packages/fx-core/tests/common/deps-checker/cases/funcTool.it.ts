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
import * as sinon from "sinon";

chai.use(spies);
const expect = chai.expect;
const assert = chai.assert;

describe("FuncToolChecker E2E Test", async () => {
  const sandbox = sinon.createSandbox();
  beforeEach(async function () {
    await funcUtils.cleanup();
    console.error("cleanup portable func and sandbox");
  });

  afterEach(async function () {
    sandbox.restore();
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
    sandbox
      .stub(FuncToolChecker, <any>"getDefaultInstallPath")
      .returns(
        path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "func", "Aarón García", "for test")
      );

    const spyChecker = sandbox.spy(funcToolChecker);
    const res = await spyChecker.resolve();
    assert.isTrue(spyChecker.getInstallationInfo.calledTwice);

    expect(res.isInstalled).to.be.equal(true);
    expect((await funcToolChecker.getInstallationInfo()).isInstalled).to.be.equal(true);
    expect(res.details.binFolders).to.to.have.all.members(
      funcToolChecker.getPortableFuncBinFolders()
    );
    assert.isTrue(
      /node "[^"]*"$/g.test(res.command),
      `should use portable func, and func command = ${res.command}`
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
    sandbox.stub(FuncToolChecker.prototype, <any>"doInstallPortableFunc");

    const res = await funcToolChecker.resolve();
    assert.isFalse(res.isInstalled);
    assert.isFalse((await funcToolChecker.getInstallationInfo()).isInstalled);

    // second: still works well
    sandbox.restore();
    const spyChecker = sandbox.spy(funcToolChecker);
    const retryRes = await spyChecker.resolve();
    assert.isTrue(spyChecker.getInstallationInfo.calledTwice);

    assert.isTrue(retryRes.isInstalled);
    assert.isTrue(
      (await funcToolChecker.getInstallationInfo()).isInstalled,
      "second run, should success"
    );
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
    const depsInfo = await funcToolChecker.getInstallationInfo();

    expect(depsInfo.details.isLinuxSupported).to.be.equal(false);
    expect(depsInfo.command).to.be.equal("npx azure-functions-core-tools@3");
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

    const depsInfo = await funcToolChecker.getInstallationInfo();
    expect(depsInfo.isInstalled).to.be.equal(true);
    expect(depsInfo.command).to.be.equal("func", `should use global func`);

    const spyChecker = sandbox.spy(funcToolChecker);
    const retryRes = await spyChecker.resolve();
    assert.isTrue(spyChecker.getInstallationInfo.calledOnce);
    expect(retryRes.isInstalled).to.be.equal(true);

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

    const spyChecker = sandbox.spy(funcToolChecker);
    const res = await spyChecker.resolve();
    assert.isTrue(spyChecker.getInstallationInfo.calledTwice);

    assert.isTrue(res.isInstalled);
    expect((await funcToolChecker.getInstallationInfo()).isInstalled).to.be.equal(true);
    assert.isTrue(/node "[^"]*"$/g.test(res.command), `should use portable func`);
    await assertFuncStart(funcToolChecker);
  });
});

async function assertFuncStart(funcToolChecker: FuncToolChecker): Promise<void> {
  const funcExecCommand = (await funcToolChecker.getInstallationInfo()).command;
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
