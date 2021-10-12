// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as spies from "chai-spies";
import * as ngrokUtils from "../utils/ngrok";
import { DepsChecker, IDepsAdapter } from "../../../../src/debug/depsChecker/checker";
import { TestAdapter } from "../adapters/testAdapter";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { NgrokChecker } from "../../../../src/debug/depsChecker/ngrokChecker";
import * as path from "path";
import * as os from "os";
import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

chai.use(spies);
const expect = chai.expect;
const assert = chai.assert;
const sandbox = chai.spy.sandbox();

function createTestChecker(): [DepsChecker, NgrokChecker, IDepsAdapter] {
  const testAdapter = new TestAdapter(false, false, false, false, false);
  testAdapter.enableNgrok();
  const telemetry = new TestTelemetry();
  const ngrokChecker = new NgrokChecker(testAdapter, logger, telemetry);
  const depsChecker = new DepsChecker(logger, testAdapter, [ngrokChecker]);
  return [depsChecker, ngrokChecker, testAdapter];
}

suite("NgrokChecker E2E Test", async () => {
  setup(async function (this: Mocha.Context) {
    await ngrokUtils.cleanup();
    sandbox.restore();
    console.error("cleanup ngrok and sandbox");
  });

  test("not install + special character dir", async function (this: Mocha.Context) {
    const [depsChecker, ngrokChecker, ,] = createTestChecker();
    sandbox.on(ngrokChecker, "getDefaultInstallPath", () =>
      path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "ngrok", "Aarón García", "for test")
    );

    const shouldContinue = await depsChecker.resolve();

    expect(shouldContinue).to.be.equal(true);
    assert.isTrue(await ngrokChecker.isInstalled());
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
