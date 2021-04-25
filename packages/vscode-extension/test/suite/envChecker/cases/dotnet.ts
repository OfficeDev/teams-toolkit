// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as path from "path";
import * as chai from "chai";

import * as dotnetCheckerUtils from "../utils/dotnet";
import { isLinux } from "../../../../src/debug/depsChecker/common";
import { DepsChecker } from "../../../../src/debug/depsChecker/checker";
import { DotnetChecker } from "../../../../src/debug/depsChecker/dotnetChecker";
import { TestAdapter } from "../adapters/testAdapter";
import { TestLogger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { ConfigFolderName } from "fx-api";

const dotnetConfigPath = path.join(os.homedir(), "." + ConfigFolderName, "dotnet.json");

function createTestChecker(
  hasTeamsfxBackend: boolean,
  clickCancel = false,
  dotnetCheckerEnabled = true,
  funcToolCheckerEnabled = true,
  nodeCheckerEnabled = true) {

  const testAdapter = new TestAdapter(hasTeamsfxBackend, clickCancel, dotnetCheckerEnabled, funcToolCheckerEnabled, nodeCheckerEnabled);
  const depsChecker = new DepsChecker(testAdapter, [new DotnetChecker(testAdapter, new TestLogger(), new TestTelemetry())]);

  return depsChecker;
}

suite("DotnetChecker E2E Test", async () => {
  test("Dotnet SDK is not installed, whether globally or in home dir", async function(this: Mocha.Context) {
    if (await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath) !== null) {
      this.skip();
    }
    if (await dotnetCheckerUtils.hasDotnetVersion("dotnet", "3.1")) {
      this.skip();
    }
    if (await dotnetCheckerUtils.hasDotnetVersion("dotnet", "5.0")) {
      this.skip();
    }

    const checker = createTestChecker(true);

    let shouldContinue: boolean = false;
    chai.assert.doesNotThrow(async () => {
      shouldContinue = await checker.resolve();
    })

    if (isLinux()) {
      chai.assert.isFalse(shouldContinue);
    } else {
      chai.assert.isTrue(shouldContinue);

      const dotnetExecPath = await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath);
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(await dotnetCheckerUtils.hasDotnetVersion(dotnetExecPath!, "3.1"));
    }
  });

  test("Dotnet SDK supported version is installed globally", async function(this: Mocha.Context) {
    if (await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath) !== null) {
      this.skip();
    }
    if (!(await dotnetCheckerUtils.hasDotnetVersion("dotnet", "3.1") || await dotnetCheckerUtils.hasDotnetVersion("dotnet", "5.0"))) {
      this.skip();
    }
  });
});
