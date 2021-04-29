// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as fs from "fs-extra";

import * as dotnetUtils from "../utils/dotnet";
import { isLinux } from "../../../../src/debug/depsChecker/common";
import { DepsChecker } from "../../../../src/debug/depsChecker/checker";
import { DotnetChecker } from "../../../../src/debug/depsChecker/dotnetChecker";
import { CustomDotnetInstallScript, TestAdapter } from "../adapters/testAdapter";
import { TestLogger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { commandExistsInPath } from "../utils/common";

function createTestChecker(
  hasTeamsfxBackend: boolean,
  clickCancel = false,
  dotnetCheckerEnabled = true,
  funcToolCheckerEnabled = true,
  nodeCheckerEnabled = true,
  customDotnetInstallScript = new CustomDotnetInstallScript()
): [DepsChecker, DotnetChecker] {
  const testAdapter = new TestAdapter(
    hasTeamsfxBackend,
    clickCancel,
    dotnetCheckerEnabled,
    funcToolCheckerEnabled,
    nodeCheckerEnabled,
    customDotnetInstallScript
  );
  const logger = new TestLogger();
  const dotnetChecker = new DotnetChecker(testAdapter, logger, new TestTelemetry());
  const depsChecker = new DepsChecker(logger, testAdapter, [dotnetChecker]);

  return [depsChecker, dotnetChecker];
}

suite("DotnetChecker E2E Test - first run", async () => {
  setup(async function(this: Mocha.Context) {
    await dotnetUtils.cleanup();
    // cleanup to make sure the environment is clean before test
  });

  test(".NET SDK is not installed, whether globally or in home dir", async function(this: Mocha.Context) {
    if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const [checker, _] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );

    // should continue because this is the case where the user clicks continue
    chai.assert.isTrue(shouldContinue);

    if (isLinux()) {
      chai.assert.isNull(dotnetExecPath);
    } else {
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(
        await dotnetUtils.hasDotnetVersion(dotnetExecPath!, dotnetUtils.dotnetInstallVersion)
      );
    }
  });

  test(".NET SDK supported version is installed globally", async function(this: Mocha.Context) {
    if (
      !(await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      ))
    ) {
      this.skip();
    }

    const dotnetFullPath = await commandExistsInPath(dotnetUtils.dotnetCommand);
    chai.assert.isNotNull(dotnetFullPath);

    const [checker, dotnetChecker] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);

    const dotnetExecPathFromConfig = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );
    chai.assert.isNotNull(dotnetExecPathFromConfig);
    chai.assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(
        dotnetExecPathFromConfig!,
        dotnetUtils.dotnetSupportedVersions
      )
    );

    // test dotnet executable is from config file.
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.equal(dotnetExecPathFromConfig, dotnetExecPath);
  });

  test(".NET SDK is too old", async function(this: Mocha.Context) {
    const has21 = await dotnetUtils.hasDotnetVersion(
      dotnetUtils.dotnetCommand,
      dotnetUtils.dotnetOldVersion
    );
    const hasSupported = await dotnetUtils.hasAnyDotnetVersions(
      dotnetUtils.dotnetCommand,
      dotnetUtils.dotnetSupportedVersions
    );
    if (!(has21 && !hasSupported)) {
      this.skip();
    }

    chai.assert.isTrue(await commandExistsInPath(dotnetUtils.dotnetCommand));

    const [checker, _] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );

    if (isLinux()) {
      chai.assert.isTrue(shouldContinue);
      chai.assert.isNull(dotnetExecPath);
    } else {
      chai.assert.isTrue(shouldContinue);
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(
        await dotnetUtils.hasDotnetVersion(dotnetExecPath!, dotnetUtils.dotnetInstallVersion)
      );
    }
  });

  test(".NET SDK not installed, for frontend-only projects", async function(this: Mocha.Context) {
    if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const [checker, _] = createTestChecker(false);

    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );

    chai.assert.isTrue(shouldContinue);

    if (isLinux()) {
      chai.assert.isNull(dotnetExecPath);
    } else {
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(
        await dotnetUtils.hasDotnetVersion(dotnetExecPath!, dotnetUtils.dotnetInstallVersion)
      );
    }
  });

  test("DotnetChecker feature flag", async function(this: Mocha.Context) {
    const [checker, dotnetChecker] = createTestChecker(true, false, false);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
    const dotnetExecPathFromConfig = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );
    chai.assert.isNull(dotnetExecPathFromConfig);

    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.equal(dotnetExecPath, dotnetUtils.dotnetCommand);
  });

  test(".NET SDK installation failure", async function (this: Mocha.Context) {
    if (isLinux() || await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const [checker, dotnetChecker] = createTestChecker(true, false, true, true, true, new CustomDotnetInstallScript(true, 1));

    const shouldContinue = await checker.resolve();
    const dotnetExecPathFromConfig = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );

    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();

    chai.assert.isFalse(shouldContinue);
    chai.assert.isNull(dotnetExecPathFromConfig);
    chai.assert.equal(dotnetExecPath, dotnetUtils.dotnetCommand);
  });

  teardown(async function(this: Mocha.Context) {
    // cleanup to make sure the environment is clean
    await dotnetUtils.cleanup();
  });
});

suite("DotnetChecker E2E Test - second run", () => {
  setup(async function(this: Mocha.Context) {
    await dotnetUtils.cleanup();
    // cleanup to make sure the environment is clean before test
  });

  test("Valid dotnet.json file", async function(this: Mocha.Context) {});

  test("Invalid dotnet.json file", async function(this: Mocha.Context) {
    // TODO: implement me
  });

  teardown(async function(this: Mocha.Context) {
    // cleanup to make sure the environment is clean
    await dotnetUtils.cleanup();
  });
});
