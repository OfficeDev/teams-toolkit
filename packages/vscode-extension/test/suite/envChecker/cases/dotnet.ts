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
import { commandExistsInPath } from "../utils/common";

const dotnetConfigPath = path.join(os.homedir(), "." + ConfigFolderName, "dotnet.json");
const dotnetCommand = "dotnet";
const dotnetOldVersion = "2.1";
const dotnetInstallVersion = "3.1";
const dotnetSupportedVersions = ["3.1", "5.0"];

function createTestChecker(
  hasTeamsfxBackend: boolean,
  clickCancel = false,
  dotnetCheckerEnabled = true,
  funcToolCheckerEnabled = true,
  nodeCheckerEnabled = true): [DepsChecker, DotnetChecker] {

  const testAdapter = new TestAdapter(hasTeamsfxBackend, clickCancel, dotnetCheckerEnabled, funcToolCheckerEnabled, nodeCheckerEnabled);
  const dotnetChecker = new DotnetChecker(testAdapter, new TestLogger(), new TestTelemetry());
  const depsChecker = new DepsChecker(testAdapter, [dotnetChecker]);

  return [depsChecker, dotnetChecker];
}

async function removeDotnetConfig() {
    // fs-extra.remove() does nothing if the file does not exist.
    await fs.remove(dotnetConfigPath);
}

suite("DotnetChecker E2E Test - first run", async () => {
  setup(async function(this: Mocha.Context) {
    await removeDotnetConfig();
    // cleanup to make sure the environment is clean before test
  });

  test("Dotnet SDK is not installed, whether globally or in home dir", async function(this: Mocha.Context) {
    if (await commandExistsInPath(dotnetCommand)) {
      this.skip();
    }

    const [checker, _] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath);

    if (isLinux()) {
      chai.assert.isFalse(shouldContinue);
      chai.assert.isNull(dotnetExecPath);
    } else {
      chai.assert.isTrue(shouldContinue);
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(await dotnetCheckerUtils.hasDotnetVersion(dotnetExecPath!, dotnetInstallVersion));
    }

  });

  test("Dotnet SDK supported version is installed globally", async function(this: Mocha.Context) {
    if (!await dotnetCheckerUtils.hasAnyDotnetVersions(dotnetCommand, dotnetSupportedVersions)) {
      this.skip();
    }

    const dotnetFullPath = await commandExistsInPath(dotnetCommand);
    chai.assert.isNotNull(dotnetFullPath);

    const [checker, dotnetChecker] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);

    const dotnetExecPathFromConfig = await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath);
    chai.assert.isNotNull(dotnetExecPathFromConfig);

    chai.assert.isTrue(await dotnetCheckerUtils.hasAnyDotnetVersions(dotnetExecPathFromConfig!, dotnetSupportedVersions));

    // test dotnet executable is from config file.
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.equal(dotnetExecPathFromConfig, dotnetExecPath);
  });

  test("Dotnet SDK is too old", async function(this: Mocha.Context) {
    const has21 = await dotnetCheckerUtils.hasDotnetVersion(dotnetCommand, dotnetOldVersion);
    const hasSupported = await dotnetCheckerUtils.hasAnyDotnetVersions(dotnetCommand, dotnetSupportedVersions);
    if (!(has21 && !hasSupported)) {
      this.skip();
    }

    chai.assert.isTrue(await commandExistsInPath(dotnetCommand));

    const [checker, _] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath);

    if (isLinux()) {
      chai.assert.isTrue(shouldContinue);
      chai.assert.isNull(dotnetExecPath);
    } else {
      chai.assert.isTrue(shouldContinue);
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(await dotnetCheckerUtils.hasDotnetVersion(dotnetExecPath!, dotnetInstallVersion));
    }
  });

  test(".NET not installed, for frontend-only projects", async function(this: Mocha.Context) {
    if (await commandExistsInPath(dotnetCommand)) {
      this.skip();
    }

    const [checker, _] = createTestChecker(false);

    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath);

    if (isLinux()) {
      chai.assert.isFalse(shouldContinue);
      chai.assert.isNull(dotnetExecPath);
    } else {
      chai.assert.isTrue(shouldContinue);
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(await dotnetCheckerUtils.hasDotnetVersion(dotnetExecPath!, dotnetInstallVersion));
    }
  });

  test("DotnetChecker feature flag", async function(this: Mocha.Context) {
    const [checker, dotnetChecker] = createTestChecker(true, false, false);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);

    const dotnetExecPathFromConfig = await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath);
    chai.assert.isNull(dotnetExecPathFromConfig);

    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.equal(dotnetExecPath, dotnetCommand);
  });

  test(".NET SDK installation failure", async function(this: Mocha.Context) {
    // TODO: implement me
  });

  teardown(async function(this: Mocha.Context) {
    // cleanup to make sure the environment is clean
    await removeDotnetConfig();
  });
});

suite("DotnetChecker E2E Test - second run", () => {
  setup(async function(this: Mocha.Context) {
    await removeDotnetConfig();
    // cleanup to make sure the environment is clean before test
  });

  test("Valid dotnet.json file", async function(this: Mocha.Context) {

  });

  test("Invalid dotnet.json file", async function(this: Mocha.Context) {
    // TODO: implement me
  });

  teardown(async function(this: Mocha.Context) {
    // cleanup to make sure the environment is clean
    await removeDotnetConfig();
  });
});