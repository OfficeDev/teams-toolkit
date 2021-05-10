// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as nodeUtils from "../utils/node";
import * as dotnetUtils from "../utils/dotnet";
import { NodeChecker } from "../../../../src/debug/depsChecker/nodeChecker";
import { DotnetChecker } from "../../../../src/debug/depsChecker/dotnetChecker";
import { DepsChecker } from "../../../../src/debug/depsChecker/checker";
import { TestAdapter } from "../adapters/testAdapter";
import { TestLogger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { commandExistsInPath } from "../utils/common";
import { isLinux } from "../../../../src/debug/depsChecker/common";
import { AzureNodeChecker } from "../../../../src/debug/depsChecker/azureNodeChecker";

const azureSupportedNodeVersions = ["10", "12", "14"];

function createTestChecker(
  hasTeamsfxBackend: boolean,
  clickCancel = false,
  dotnetCheckerEnabled = true,
  funcToolCheckerEnabled = true,
  nodeCheckerEnabled = true
): [DepsChecker, NodeChecker, DotnetChecker] {
  const testAdapter = new TestAdapter(
    hasTeamsfxBackend,
    clickCancel,
    dotnetCheckerEnabled,
    funcToolCheckerEnabled,
    nodeCheckerEnabled
  );
  const logger = new TestLogger();
  const telemetry = new TestTelemetry();
  const nodeChecker = new AzureNodeChecker(testAdapter, logger, telemetry);
  const dotnetChecker = new DotnetChecker(testAdapter, logger, telemetry);
  const depsChecker = new DepsChecker(logger, testAdapter, [dotnetChecker]);

  return [depsChecker, nodeChecker, dotnetChecker];
}

suite("All checkers E2E test", async () => {
  teardown(async function(this: Mocha.Context) {
    await dotnetUtils.cleanup();
  });

  test("All installed", async function(this: Mocha.Context) {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (!(nodeVersion != null && azureSupportedNodeVersions.includes(nodeVersion))) {
      this.skip();
    }
    if (
      !(await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      ))
    ) {
      this.skip();
    }

    const [checker, _, dotnetChecker] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.isNotNull(dotnetExecPath);
    chai.assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
    );
  });

  test("None installed", async function(this: Mocha.Context) {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (nodeVersion != null) {
      this.skip();
    }
    if (
      await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      )
    ) {
      this.skip();
    }

    const [checker, _, dotnetChecker] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    if (isLinux()) {
      chai.assert.isNull(dotnetExecPath);
      chai.assert.isFalse(
        await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
      );
    } else {
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(
        await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
      );
    }
  });

  test("Node.js is installed, but .NET SDK is not", async function(this: Mocha.Context) {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (!(nodeVersion != null && azureSupportedNodeVersions.includes(nodeVersion))) {
      this.skip();
    }
    if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const [checker, _, dotnetChecker] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
    const dotnetExecPath = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );
    if (isLinux()) {
      chai.assert.isNull(dotnetExecPath);
    } else {
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(
        await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
      );
    }
  });

  test("All disabled", async function(this: Mocha.Context) {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (nodeVersion != null) {
      this.skip();
    }
    if (
      await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      )
    ) {
      this.skip();
    }

    const [checker, _, dotnetChecker] = createTestChecker(true, false, false, false, false);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.isNotNull(dotnetExecPath);
    chai.assert.equal(dotnetExecPath!, dotnetUtils.dotnetCommand);
  });

  teardown(async function(this: Mocha.Context) {
    await dotnetUtils.cleanup();
  });
});
