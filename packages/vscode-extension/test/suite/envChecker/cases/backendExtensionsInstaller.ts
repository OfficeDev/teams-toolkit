// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as chai from "chai";
import * as dotnetUtils from "../utils/dotnet";
import * as chaiAsPromised from "chai-as-promised";
import { DotnetChecker } from "../../../../src/debug/depsChecker/dotnetChecker";
import { TestAdapter } from "../adapters/testAdapter";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { isNonEmptyDir } from "../utils/common";
import {
  addDotnetNugetSource,
  createDotnetNugetConfig,
  listDotnetNugetSource,
  testCsprojFileName,
  testOutputDirName,
} from "../utils/backendExtensionsInstaller";
import { BackendExtensionsInstaller } from "../../../../src/debug/depsChecker/backendExtensionsInstall";
chai.use(chaiAsPromised);

function createTestBackendExtensionsInstaller(): [DotnetChecker, BackendExtensionsInstaller] {
  const testAdapter = new TestAdapter(true, false, true);
  const telemetry = new TestTelemetry();
  const dotnetChecker = new DotnetChecker(testAdapter, logger, telemetry);
  const backendExtensionsInstaller = new BackendExtensionsInstaller(dotnetChecker, logger);
  return [dotnetChecker, backendExtensionsInstaller];
}

suite("Backend extensions installer E2E test", async () => {
  // setup a backend project dir with extensions.csproj
  let backendProjectDir: string;
  let backendOutputPath: string;
  let cleanupProjectDir: () => void;
  setup(async function (this: Mocha.Context) {
    [backendProjectDir, cleanupProjectDir] = await dotnetUtils.createTmpBackendProjectDir(
      testCsprojFileName
    );
    backendOutputPath = path.resolve(backendProjectDir, testOutputDirName);

    await dotnetUtils.cleanup();
  });

  test("Backend extensions install when .NET SDK is installed", async function (this: Mocha.Context) {
    // make sure .NET SDK are installed
    if (
      !(await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      ))
    ) {
      this.skip();
    }

    const [dotnetChecker, backendExtensionsInstaller] = createTestBackendExtensionsInstaller();
    chai.assert.isTrue(await dotnetChecker.isInstalled());
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.isNotNull(dotnetExecPath);
    chai.assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
    );

    // setup nuget config to prevent affecting the tester's local environment
    await createDotnetNugetConfig(dotnetExecPath, backendProjectDir);

    chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
    await backendExtensionsInstaller.install(
      backendProjectDir,
      testCsprojFileName,
      testOutputDirName
    );
    chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));
  });

  test("Broken NuGet sources", async function (this: Mocha.Context) {
    // make sure .NET SDK are installed
    if (
      !(await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      ))
    ) {
      this.skip();
    }

    const [dotnetChecker, backendExtensionsInstaller] = createTestBackendExtensionsInstaller();
    chai.assert.isTrue(await dotnetChecker.isInstalled());
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
    chai.assert.isNotNull(dotnetExecPath);
    chai.assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(dotnetExecPath!, dotnetUtils.dotnetSupportedVersions)
    );

    // setup nuget config to prevent affecting the tester's local environment
    await createDotnetNugetConfig(dotnetExecPath, backendProjectDir);
    // setup a broken nuget source
    await addDotnetNugetSource(
      dotnetExecPath,
      backendProjectDir,
      "fail",
      "https://this.does.not.exist"
    );
    // log the output of list nuget source
    await listDotnetNugetSource(dotnetExecPath, backendProjectDir);

    chai.assert.isFalse(await isNonEmptyDir(backendOutputPath));
    await backendExtensionsInstaller.install(
      backendProjectDir,
      testCsprojFileName,
      testOutputDirName
    );
    chai.assert.isTrue(await isNonEmptyDir(backendOutputPath));
  });

  teardown(async function (this: Mocha.Context) {
    await dotnetUtils.cleanup();
    cleanupProjectDir();
  });
});
