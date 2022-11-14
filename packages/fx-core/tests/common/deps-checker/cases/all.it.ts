// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import chai from "chai";
import * as dotnetUtils from "../utils/dotnet";
import * as funcUtils from "../utils/funcTool";
import * as nodeUtils from "../utils/node";
import { isLinux } from "../../../../src/common/deps-checker/util/system";
import { DependencyStatus, DepsType } from "../../../../src/common/deps-checker/depsChecker";
import { DepsManager } from "../../../../src/common/deps-checker/depsManager";
import { cpUtils } from "../../../../src/common/deps-checker/util/cpUtils";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import "mocha";
import { isNonEmptyDir } from "../utils/common";
import { testCsprojFileName, testOutputDirName } from "../utils/backendExtensionsInstaller";
import { installExtension } from "../../../../src/common/deps-checker/util/extensionInstaller";

const expect = chai.expect;
const assert = chai.assert;

describe("All checkers E2E test", async () => {
  let backendProjectDir: string;
  let backendOutputPath: string;
  let cleanupProjectDir: () => void;
  beforeEach(async function () {
    [backendProjectDir, cleanupProjectDir] = await dotnetUtils.createTmpBackendProjectDir(
      dotnetUtils.testCsprojFileName
    );
    backendOutputPath = path.resolve(backendProjectDir, dotnetUtils.testOutputDirName);
    await dotnetUtils.cleanup();
    await funcUtils.cleanup();
  });

  afterEach(async function () {
    // cleanup to make sure the environment is clean
    await dotnetUtils.cleanup();
    cleanupProjectDir();
  });

  it("All installed", async function () {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (!(nodeVersion != null && nodeUtils.azureSupportedNodeVersions.includes(nodeVersion))) {
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
    if (!(await funcUtils.isFuncCoreToolsInstalled())) {
      this.skip();
    }

    const depsTypes = [DepsType.AzureNode, DepsType.FuncCoreTools, DepsType.Dotnet];
    const depsManger = new DepsManager(logger, new TestTelemetry());

    const depsStatus = await depsManger.ensureDependencies(depsTypes, { fastFail: true });

    verifyAllSuccess(depsStatus);

    // verify node (and order = 0)
    const node = depsStatus[0];
    assert.equal(node.type, DepsType.AzureNode);

    // verify dotnet (and order = 1)
    const dotnet = depsStatus[1];
    assert.equal(dotnet.type, DepsType.Dotnet);
    chai.assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(dotnet.command!, dotnetUtils.dotnetSupportedVersions)
    );

    // verify funcTools (and order = 2)
    const funcTool = depsStatus[2];
    assert.equal(funcTool.type, DepsType.FuncCoreTools);
    assert.equal(funcTool.command, "func", `should use global func-core-tools`);
    const funcStartResult: cpUtils.ICommandResult = await cpUtils.tryExecuteCommand(
      undefined,
      logger,
      { shell: true },
      `${funcTool.command} start`
    );
    // func start can work: "Unable to find project root. Expecting to find one of host.json, local.settings.json in project root."
    chai.assert.isTrue(
      funcStartResult.cmdOutputIncludingStderr.includes("Unable to find project root"),
      `func start should return error message that contains "Unable to find project root", but actual output: "${funcStartResult.cmdOutputIncludingStderr}"`
    );

    // verify backendExtension installer
    chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
    await installExtension(
      backendProjectDir,
      dotnet.command,
      logger,
      testCsprojFileName,
      testOutputDirName
    );
    chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));

    // verify get deps status
    const depsStatusFromQuery = await depsManger.getStatus(depsTypes);
    for (const status of depsStatusFromQuery) {
      chai.assert.isTrue(status.isInstalled);
    }
  });

  it("None installed - Linux", async function () {
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

    if (await funcUtils.isFuncCoreToolsInstalled()) {
      this.skip();
    }
    if (!isLinux()) {
      this.skip();
    }

    const depsTypes = [DepsType.Ngrok, DepsType.AzureNode, DepsType.FuncCoreTools, DepsType.Dotnet];
    const depsManger = new DepsManager(logger, new TestTelemetry());
    const depsStatus = await depsManger.ensureDependencies(depsTypes, { fastFail: true });

    // verify node
    const node = depsStatus[0];
    assert.equal(node.type, DepsType.AzureNode);
    assert.isFalse(node.isInstalled);

    // verify dotnet
    const dotnet = depsStatus[1];
    assert.equal(dotnet.type, DepsType.Dotnet);
    assert.isFalse(dotnet.isInstalled);
    assert.isFalse(
      await dotnetUtils.hasAnyDotnetVersions(dotnet.command!, dotnetUtils.dotnetSupportedVersions)
    );

    // verify funcTools
    const funcTool = depsStatus[2];
    assert.equal(funcTool.type, DepsType.FuncCoreTools);
    assert.isFalse(funcTool.isInstalled);
    chai.assert.isTrue(
      "npx azure-functions-core-tools@3" == funcTool.command,
      "for linux, should use: npx azure-functions-core-tools@3"
    );

    // verify ngrok
    await verifyNgrok(depsStatus[3]);
  });

  it("None installed - Not Linux", async function () {
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
    if (await funcUtils.isFuncCoreToolsInstalled()) {
      this.skip();
    }
    if (isLinux()) {
      this.skip();
    }

    const depsTypes = [DepsType.Ngrok, DepsType.AzureNode, DepsType.FuncCoreTools, DepsType.Dotnet];
    const depsManger = new DepsManager(logger, new TestTelemetry());

    const depsStatus = await depsManger.ensureDependencies(depsTypes, { fastFail: true });

    // verify node
    const node = depsStatus[0];
    assert.equal(node.type, DepsType.AzureNode);
    assert.isFalse(node.isInstalled);

    // verify dotnet
    const dotnet = depsStatus[1];
    assert.equal(dotnet.type, DepsType.Dotnet);
    assert.isTrue(dotnet.isInstalled);
    assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(dotnet.command!, dotnetUtils.dotnetSupportedVersions)
    );

    // verify funcTools
    await verifyFuncInstall(depsStatus[2]);

    // verify ngrok
    await verifyNgrok(depsStatus[3]);

    // verify backendExtension installer
    chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
    await installExtension(
      backendProjectDir,
      dotnet.command,
      logger,
      testCsprojFileName,
      testOutputDirName
    );
    chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));
  });

  it("Only Node installed - Not Linux", async function () {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (nodeVersion == null) {
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
    if (await funcUtils.isFuncCoreToolsInstalled()) {
      this.skip();
    }
    if (isLinux()) {
      this.skip();
    }

    const depsTypes = [DepsType.Ngrok, DepsType.AzureNode, DepsType.FuncCoreTools, DepsType.Dotnet];
    const depsManger = new DepsManager(logger, new TestTelemetry());
    const depsStatus = await depsManger.ensureDependencies(depsTypes, { fastFail: true });

    verifyAllSuccess(depsStatus);

    // verify node
    const node = depsStatus[0];
    assert.equal(node.type, DepsType.AzureNode);
    assert.isTrue(node.isInstalled);
    assert.isNotNull(node.command);
    assert.isUndefined(node.error);

    // verify dotnet
    const dotnet = depsStatus[1];
    assert.equal(dotnet.type, DepsType.Dotnet);
    assert.isTrue(dotnet.isInstalled);
    assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(dotnet.command!, dotnetUtils.dotnetSupportedVersions)
    );

    // verify funcTools
    await verifyFuncInstall(depsStatus[2]);

    // verify ngrok
    await verifyNgrok(depsStatus[3]);
  });
});

function verifyAllSuccess(depsStatus: DependencyStatus[]) {
  // verify all install
  for (const dep of depsStatus) {
    assert.isTrue(dep.isInstalled);
    assert.isNotNull(dep.command);
    assert.isUndefined(dep.error);
    assert.isNotNull(dep.details.supportedVersions);
  }
}

async function verifyFuncInstall(funcTool: DependencyStatus) {
  assert.equal(funcTool.type, DepsType.FuncCoreTools);
  const funcExecCommand = `${funcTool.command} start`;
  chai.assert.isTrue(
    /node "[^"]*" start/g.test(funcExecCommand),
    `should use private func-core-tools`
  );
  const funcStartResult: cpUtils.ICommandResult = await cpUtils.tryExecuteCommand(
    undefined,
    logger,
    { shell: true },
    funcExecCommand
  );
  // func start can work: "Unable to find project root. Expecting to find one of host.json, local.settings.json in project root."
  chai.assert.isTrue(
    funcStartResult.cmdOutputIncludingStderr.includes("Unable to find project root"),
    `func start should return error message that contains "Unable to find project root", but actual output: "${funcStartResult.cmdOutputIncludingStderr}"`
  );
}

async function verifyNgrok(ngrok: DependencyStatus) {
  assert.equal(ngrok.type, DepsType.Ngrok);
  assert.isTrue(ngrok.isInstalled);
  assert.isNotNull(ngrok.details.binFolders);
  const ngrokVersionResult: cpUtils.ICommandResult = await cpUtils.tryExecuteCommand(
    undefined,
    logger,
    {
      shell: true,
      env: { PATH: ngrok.details.binFolders?.[0] },
    },
    "ngrok version"
  );
  // ngrok version 2.3.x
  expect(ngrokVersionResult.cmdOutputIncludingStderr).to.includes(
    "ngrok version 2.3.",
    `ngrok version should return version string contains "ngrok version 2.3.", but actual output: "${ngrokVersionResult.cmdOutputIncludingStderr}"`
  );
}
