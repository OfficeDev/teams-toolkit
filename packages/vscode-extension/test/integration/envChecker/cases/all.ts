// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as chai from "chai";
import * as nodeUtils from "../utils/node";
import * as dotnetUtils from "../utils/dotnet";
import * as funcUtils from "../utils/funcTool";
import * as chaiAsPromised from "chai-as-promised";
import { NodeChecker } from "../../../../src/debug/depsChecker/nodeChecker";
import { DotnetChecker } from "../../../../src/debug/depsChecker/dotnetChecker";
import { DepsChecker } from "../../../../src/debug/depsChecker/checker";
import { TestAdapter } from "../adapters/testAdapter";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { commandExistsInPath, isNonEmptyDir } from "../utils/common";
import { azureSupportedNodeVersions } from "../utils/node";
import { testCsprojFileName, testOutputDirName } from "../utils/backendExtensionsInstaller";
import { isLinux } from "../../../../src/debug/depsChecker/common";
import { AzureNodeChecker } from "../../../../src/debug/depsChecker/azureNodeChecker";
import { BackendExtensionsInstaller } from "../../../../src/debug/depsChecker/backendExtensionsInstall";
import { FuncToolChecker } from "../../../../src/debug/depsChecker/funcToolChecker";
import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";
chai.use(chaiAsPromised);

function createTestChecker(
  hasTeamsfxBackend: boolean,
  clickCancel = false,
  dotnetCheckerEnabled = true,
  funcToolCheckerEnabled = true,
  nodeCheckerEnabled = true
): [DepsChecker, NodeChecker, DotnetChecker, BackendExtensionsInstaller, FuncToolChecker] {
  const testAdapter = new TestAdapter(
    hasTeamsfxBackend,
    clickCancel,
    dotnetCheckerEnabled,
    funcToolCheckerEnabled,
    nodeCheckerEnabled
  );
  const telemetry = new TestTelemetry();
  const nodeChecker = new AzureNodeChecker(testAdapter, logger, telemetry);
  const dotnetChecker = new DotnetChecker(testAdapter, logger, telemetry);
  const funcToolChecker = new FuncToolChecker(testAdapter, logger, telemetry);
  const depsChecker = new DepsChecker(logger, testAdapter, [dotnetChecker, funcToolChecker]);
  const backendExtensionsInstaller = new BackendExtensionsInstaller(dotnetChecker, logger);

  return [depsChecker, nodeChecker, dotnetChecker, backendExtensionsInstaller, funcToolChecker];
}

suite("All checkers E2E test", async () => {
  let backendProjectDir: string;
  let backendOutputPath: string;
  let cleanupProjectDir: () => void;
  setup(async function (this: Mocha.Context) {
    [backendProjectDir, cleanupProjectDir] = await dotnetUtils.createTmpBackendProjectDir(
      testCsprojFileName
    );
    backendOutputPath = path.resolve(backendProjectDir, testOutputDirName);

    await dotnetUtils.cleanup();
    await funcUtils.cleanup();
  });

  test("All installed", async function (this: Mocha.Context) {
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
    if (!(await funcUtils.isFuncCoreToolsInstalled())) {
      this.skip();
    }

    const [checker, _, dotnetChecker, backendExtensionsInstaller, funcToolChecker] =
      createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);

    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.isNotNull(dotnetExecPath);
    chai.assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
    );

    const funcExecCommand = await funcToolChecker.getFuncCommand();
    chai.assert.equal(funcExecCommand, "func", `should use global func-core-tools`);
    const funcStartResult: cpUtils.ICommandResult = await cpUtils.tryExecuteCommand(
      undefined,
      logger,
      { shell: true },
      `${funcExecCommand} start`
    );
    // func start can work: "Unable to find project root. Expecting to find one of host.json, local.settings.json in project root."
    chai.assert.isTrue(
      funcStartResult.cmdOutputIncludingStderr.includes("Unable to find project root"),
      `func start should return error message that contains "Unable to find project root", but actual output: "${funcStartResult.cmdOutputIncludingStderr}"`
    );

    chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
    await backendExtensionsInstaller.install(
      backendProjectDir,
      testCsprojFileName,
      testOutputDirName
    );
    chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));
  });

  test("None installed", async function (this: Mocha.Context) {
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

    const [checker, _, dotnetChecker, backendExtensionsInstaller, funcToolChecker] =
      createTestChecker(true);

    const shouldContinue = await checker.resolve();
    chai.assert.isTrue(shouldContinue);
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();

    if (isLinux()) {
      chai.assert.isNull(dotnetExecPath);
      chai.assert.isFalse(
        await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
      );
      chai.assert.isTrue(
        "npx azure-functions-core-tools@3" == (await funcToolChecker.getFuncCommand()),
        "for linux, should use: npx azure-functions-core-tools@3"
      );
    } else {
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(
        await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
      );

      chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
      await backendExtensionsInstaller.install(
        backendProjectDir,
        testCsprojFileName,
        testOutputDirName
      );
      chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));

      const funcExecCommand = `${await funcToolChecker.getFuncCommand()} start`;
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
  });

  test("Node.js is installed, but .NET SDK is not", async function (this: Mocha.Context) {
    const nodeVersion = await nodeUtils.getNodeVersion();
    if (!(nodeVersion != null && azureSupportedNodeVersions.includes(nodeVersion))) {
      this.skip();
    }
    if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const [checker, _, dotnetChecker, backendExtensionsInstaller, ,] = createTestChecker(true);

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

      chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
      await backendExtensionsInstaller.install(
        backendProjectDir,
        testCsprojFileName,
        testOutputDirName
      );
      chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));
    }
  });

  test("All disabled", async function (this: Mocha.Context) {
    const [checker, _, dotnetChecker, backendExtensionsInstaller, funcToolChecker] =
      createTestChecker(true, false, false, false, false);
    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    const funcCommand = await funcToolChecker.getFuncCommand();

    chai.assert.isTrue(shouldContinue);
    chai.assert.isNotNull(dotnetExecPath);
    chai.assert.equal(dotnetExecPath!, dotnetUtils.dotnetCommand);
    chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));

    if (await funcUtils.isFuncCoreToolsInstalled()) {
      chai.assert.equal(
        "func",
        funcCommand,
        "when disable func and func already installed, should use: func"
      );
    } else {
      chai.assert.equal(
        "npx azure-functions-core-tools@3",
        funcCommand,
        "when disable func, should use: npx azure-functions-core-tools@3"
      );
    }

    if (
      await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      )
    ) {
      await backendExtensionsInstaller.install(
        backendProjectDir,
        testCsprojFileName,
        testOutputDirName
      );
      chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));
    } else {
      // If dotnet command is not found, spawn will throw an ENOENT error
      await chai.assert.isRejected(
        backendExtensionsInstaller.install(
          backendProjectDir,
          testCsprojFileName,
          testOutputDirName
        ),
        /ENOENT/
      );
      chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
    }
  });

  teardown(async function (this: Mocha.Context) {
    await dotnetUtils.cleanup();
    cleanupProjectDir();
  });
});
