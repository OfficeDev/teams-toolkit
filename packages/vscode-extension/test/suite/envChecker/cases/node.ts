// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as nodeUtils from "../utils/node";
import { NodeChecker } from "../../../../src/debug/depsChecker/nodeChecker";
import { DepsChecker } from "../../../../src/debug/depsChecker/checker";
import { TestAdapter } from "../adapters/testAdapter";
import { TestLogger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { ConfigFolderName } from "fx-api";
import { isLinux } from "../../../../src/utils/commonUtils";
import { AzureNodeChecker } from "../../../../src/debug/depsChecker/azureNodeChecker";

const azureSupportedNodeVersions = ["10", "12", "14"];

function createTestChecker(
  hasTeamsfxBackend: boolean,
  clickCancel = false,
  dotnetCheckerEnabled = true,
  funcToolCheckerEnabled = true,
  nodeCheckerEnabled = true
): [DepsChecker, NodeChecker] {
  const testAdapter = new TestAdapter(
    hasTeamsfxBackend,
    clickCancel,
    dotnetCheckerEnabled,
    funcToolCheckerEnabled,
    nodeCheckerEnabled
  );
  const logger = new TestLogger();
  const nodeChecker = new AzureNodeChecker(testAdapter, logger, new TestTelemetry());
  const depsChecker = new DepsChecker(logger, testAdapter, [nodeChecker]);

  return [depsChecker, nodeChecker];
}

suite("NodeChecker E2E Test", async () => {
  test("Node supported version is installed", async function(this: Mocha.Context) {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (!(nodeVersion != null && azureSupportedNodeVersions.includes(nodeVersion))) {
      this.skip();
    }

    const [checker, _] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
  });

  test("Node is not installed", async function(this: Mocha.Context) {
    if ((await nodeUtils.getNodeVersion()) !== null) {
      this.skip();
    }

    const [checker, _] = createTestChecker(true, true);

    const shouldContinue = await checker.resolve();
    chai.assert.isFalse(shouldContinue);
  });

  test("Node unsupported version is installed, and the user clicks continue", async function(this: Mocha.Context) {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (!(nodeVersion != null && !azureSupportedNodeVersions.includes(nodeVersion))) {
      this.skip();
    }

    const [checker, _] = createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
  });

  test("Node unsupported version is installed, and the user clicks cancel", async function(this: Mocha.Context) {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (!(nodeVersion != null && !azureSupportedNodeVersions.includes(nodeVersion))) {
      this.skip();
    }

    const [checker, _] = createTestChecker(true, true);

    const shouldContinue = await checker.resolve();
    chai.assert.isFalse(shouldContinue);
  });

  test("Node is not installed, and feature flag disabled", async function(this: Mocha.Context) {
    if ((await nodeUtils.getNodeVersion()) !== null) {
      this.skip();
    }

    const [checker, _] = createTestChecker(true, false, false, false, false);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
  });
});
