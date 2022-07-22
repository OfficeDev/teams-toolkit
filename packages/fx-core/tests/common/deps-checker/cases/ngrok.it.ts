// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import chai from "chai";
import spies from "chai-spies";
import * as ngrokUtils from "../utils/ngrok";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { NgrokChecker } from "../../../../src/common/deps-checker/internal/ngrokChecker";
import * as path from "path";
import * as os from "os";
import { cpUtils } from "../../../../src/common/deps-checker/util/cpUtils";
import { DepsType } from "../../../../src/common/deps-checker/depsChecker";
import { CheckerFactory } from "../../../../src/common/deps-checker/checkerFactory";
import { ConfigFolderName } from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";

chai.use(spies);
const expect = chai.expect;
const assert = chai.assert;

describe("NgrokChecker E2E Test", async () => {
  const sandbox = sinon.createSandbox();
  beforeEach(async function (this: Mocha.Context) {
    await ngrokUtils.cleanup();
    console.error("cleanup ngrok and sandbox");
  });

  afterEach(async function () {
    sandbox.restore();
  });

  it("not install + special character dir", async function (this: Mocha.Context) {
    const ngrokChecker = CheckerFactory.createChecker(
      DepsType.Ngrok,
      logger,
      new TestTelemetry()
    ) as NgrokChecker;
    sandbox
      .stub(NgrokChecker.prototype, <any>"getDefaultInstallPath")
      .returns(
        path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "ngrok", "Aarón García", "for test")
      );

    const getInstallationInfoSpy = sandbox.spy(ngrokChecker, "getInstallationInfo");
    const res = await ngrokChecker.resolve();
    assert.isTrue(getInstallationInfoSpy.calledTwice);

    expect(res.isInstalled).to.be.equal(true);
    assert.isTrue((await ngrokChecker.getInstallationInfo()).isInstalled);
    await assertNgrokVersion(ngrokChecker);
  });

  it("install twice", async function (this: Mocha.Context) {
    const ngrokChecker = CheckerFactory.createChecker(
      DepsType.Ngrok,
      logger,
      new TestTelemetry()
    ) as NgrokChecker;

    const res1 = await ngrokChecker.resolve();
    expect(res1.isInstalled).to.be.equal(true);

    const spyChecker = sandbox.spy(ngrokChecker);
    const res2 = await spyChecker.resolve();
    assert.isTrue(spyChecker.getInstallationInfo.calledOnce);

    expect(res2.isInstalled).to.be.equal(true);
    assert.isTrue((await ngrokChecker.getInstallationInfo()).isInstalled);
    await assertNgrokVersion(ngrokChecker);
  });
});

async function assertNgrokVersion(ngrokChecker: NgrokChecker): Promise<void> {
  const ngrokBinFolder = ngrokChecker.getNgrokBinFolder();
  const ngrokVersionResult: cpUtils.ICommandResult = await cpUtils.tryExecuteCommand(
    undefined,
    logger,
    {
      shell: true,
      env: { PATH: ngrokBinFolder },
    },
    "ngrok version"
  );
  // ngrok version 2.3.x
  expect(ngrokVersionResult.cmdOutputIncludingStderr).to.includes(
    "ngrok version 2.3.",
    `ngrok version should return version string contains "ngrok version 2.3.", but actual output: "${ngrokVersionResult.cmdOutputIncludingStderr}"`
  );
}
