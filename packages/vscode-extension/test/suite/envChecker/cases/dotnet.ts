// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as path from "path";
import * as chai from "chai";
import * as fs from "fs-extra";

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

async function removeDotnetConfig() {
    // fs-extra.remove() does nothing if the file does not exist.
    await fs.remove(path.resolve(os.homedir(), "." + ConfigFolderName, "dotnet.json"));
}

suite("DotnetChecker E2E Test - first run", async () => {
  setup(async function(this: Mocha.Context) {
    await removeDotnetConfig();
    // cleanup to make sure the environment is clean before test
  });

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

    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath);

    if (isLinux()) {
      chai.assert.isFalse(shouldContinue);
      chai.assert.isNull(dotnetExecPath);
    } else {
      chai.assert.isTrue(shouldContinue);
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

  teardown(async function(this: Mocha.Context) {
    // cleanup to make sure the environment is clean
    await removeDotnetConfig();
  });
});
