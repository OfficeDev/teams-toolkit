// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import chai from "chai";
import * as dotnetUtils from "../utils/dotnet";
import chaiAsPromised from "chai-as-promised";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { isNonEmptyDir } from "../utils/common";
import { CheckerFactory } from "../../../../src/common/deps-checker/checkerFactory";
import { DepsChecker, DepsType } from "../../../../src/common/deps-checker/depsChecker";
import {
  addDotnetNugetSource,
  createDotnetNugetConfig,
  listDotnetNugetSource,
  testCsprojFileName,
  testOutputDirName,
} from "../utils/backendExtensionsInstaller";
import { installExtension } from "../../../../src/common/deps-checker/util/extensionInstaller";
chai.use(chaiAsPromised);

describe("Backend extensions installer E2E test", async () => {
  // setup a backend project dir with extensions.csproj
  let backendProjectDir: string;
  let backendOutputPath: string;
  let cleanupProjectDir: () => void;
  const telemetry = new TestTelemetry();
  beforeEach(async function () {
    [backendProjectDir, cleanupProjectDir] = await dotnetUtils.createTmpBackendProjectDir(
      testCsprojFileName
    );
    backendOutputPath = path.resolve(backendProjectDir, testOutputDirName);

    await dotnetUtils.cleanup();
  });

  afterEach(async function () {
    await dotnetUtils.cleanup();
    cleanupProjectDir();
  });

  it("Backend extensions install when .NET SDK is installed", async function (this: Mocha.Context) {
    // make sure .NET SDK are installed
    if (
      !(await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      ))
    ) {
      this.skip();
    }

    const dotnetChecker: DepsChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      telemetry
    );
    const installationInfo = await dotnetChecker.getInstallationInfo();
    chai.assert.isTrue(installationInfo.isInstalled);
    chai.assert.isNotNull(installationInfo.command);
    chai.assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(
        installationInfo.command,
        dotnetUtils.dotnetSupportedVersions
      )
    );

    // setup nuget config to prevent affecting the tester's local environment
    await createDotnetNugetConfig(installationInfo.command, backendProjectDir);

    chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
    await installExtension(
      backendProjectDir,
      installationInfo.command,
      logger,
      testCsprojFileName,
      testOutputDirName
    );
    chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));
  });

  it("Broken NuGet sources", async function () {
    // make sure .NET SDK are installed
    if (
      !(await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      ))
    ) {
      this.skip();
    }

    const dotnetChecker: DepsChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      telemetry
    );
    const installationInfo = await dotnetChecker.getInstallationInfo();

    chai.assert.isTrue(installationInfo.isInstalled);
    const dotnetCommand = installationInfo.command;
    chai.assert.isNotNull(dotnetCommand);
    chai.assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(dotnetCommand!, dotnetUtils.dotnetSupportedVersions)
    );

    // setup nuget config to prevent affecting the tester's local environment
    await createDotnetNugetConfig(dotnetCommand, backendProjectDir);
    // setup a broken nuget source
    await addDotnetNugetSource(
      dotnetCommand,
      backendProjectDir,
      "fail",
      "https://this.does.not.exist"
    );
    // log the output of list nuget source
    await listDotnetNugetSource(dotnetCommand, backendProjectDir);

    chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
    await installExtension(
      backendProjectDir,
      dotnetCommand,
      logger,
      testCsprojFileName,
      testOutputDirName
    );
    chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));
  });
});
