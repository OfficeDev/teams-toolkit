// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";

import * as dotnetUtils from "../utils/dotnet";
import { isWindows, isLinux } from "../../../../src/debug/depsChecker/common";
import { DepsChecker } from "../../../../src/debug/depsChecker/checker";
import { DotnetChecker, DotnetVersion } from "../../../../src/debug/depsChecker/dotnetChecker";
import { CustomDotnetInstallScript, TestAdapter } from "../adapters/testAdapter";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { assertPathEqual, commandExistsInPath } from "../utils/common";
import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";

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

  test(".NET SDK is not installed and the user clicks cancel on Linux", async function(this: Mocha.Context) {
    if (!(isLinux() && !(await commandExistsInPath(dotnetUtils.dotnetCommand)))) {
      this.skip();
    }

    const [checker, dotnetChecker] = createTestChecker(true, true);

    const shouldContinue = await checker.resolve();
    const dotnetExecPathFromConfig = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();

    chai.assert.isFalse(shouldContinue);
    chai.assert.isNull(dotnetExecPathFromConfig);
    chai.assert.equal(dotnetExecPath, dotnetUtils.dotnetCommand);
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
    assertPathEqual(dotnetExecPathFromConfig!, dotnetExecPath);
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

  test(".NET SDK installation failure and manually install", async function(this: Mocha.Context) {
    if (isLinux() || (await commandExistsInPath(dotnetUtils.dotnetCommand))) {
      this.skip();
    }

    // DotnetChecker with mock dotnet-install script
    const [mockChecker, mockDotnetChecker] = createTestChecker(
      true,
      false,
      true,
      true,
      true,
      new CustomDotnetInstallScript(
        true,
        1,
        "mock dotnet installing",
        "mock dotnet install failure"
      )
    );

    const shouldContinue = await mockChecker.resolve();
    const dotnetExecPathFromConfig = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );

    const dotnetExecPath = await mockDotnetChecker.getDotnetExecPath();

    chai.assert.isFalse(shouldContinue);
    chai.assert.isNull(dotnetExecPathFromConfig);
    chai.assert.equal(dotnetExecPath, dotnetUtils.dotnetCommand);

    // DotnetChecker with correct dotnet-install script
    const [checker, dotnetChecker] = createTestChecker(true);

    // user manually install
    await dotnetUtils.withDotnet(
      dotnetChecker,
      DotnetVersion.v31,
      true,
      async (installedDotnetExecPath: string) => {
        // pre-check installed dotnet works
        chai.assert.isTrue(
          await dotnetUtils.hasDotnetVersion(
            installedDotnetExecPath,
            dotnetUtils.dotnetInstallVersion
          )
        );

        const shouldContinue = await checker.resolve();
        const dotnetExecPath = await dotnetChecker.getDotnetExecPath();

        chai.assert.isTrue(shouldContinue);
        assertPathEqual(dotnetExecPath, installedDotnetExecPath);

        chai.assert.isTrue(
          await dotnetUtils.hasDotnetVersion(dotnetExecPath, dotnetUtils.dotnetInstallVersion)
        );
      }
    );
  });

  suite("PowerShell ExecutionPolicy is default on Windows", async () => {
    if (!isWindows()) {
      return;
    }

    let originalExecutionPolicy = "Unrestricted";
    setup(async function (this: Mocha.Context) {
      originalExecutionPolicy = await cpUtils.executeCommand(undefined, logger, { shell: 'powershell.exe' }, "Get-ExecutionPolicy", "-Scope", "CurrentUser");
      cpUtils.executeCommand(undefined, logger, { shell: 'powershell.exe' }, "Set-ExecutionPolicy", "-Scope", "CurrentUser", "Restricted");
    });

    test(".NET SDK not installed and PowerShell ExecutionPolicy is default (Restricted) on Windows", async function (this: Mocha.Context) {
      if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
        this.skip();
      }

      const [checker, _] = createTestChecker(false);

      const shouldContinue = await checker.resolve();
      const dotnetExecPath = await dotnetUtils.getDotnetExecPathFromConfig(
        dotnetUtils.dotnetConfigPath
      );

      chai.assert.isTrue(shouldContinue);
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(
        await dotnetUtils.hasDotnetVersion(dotnetExecPath!, dotnetUtils.dotnetInstallVersion)
      );
    });

    teardown(async function (this: Mocha.Context) {
      cpUtils.executeCommand(undefined, logger, { shell: 'powershell.exe' }, "Set-ExecutionPolicy", "-Scope", "CurrentUser", originalExecutionPolicy);
    });
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

  test("Valid dotnet.json file", async function(this: Mocha.Context) {
    if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const [checker, dotnetChecker] = createTestChecker(true);
    await dotnetUtils.withDotnet(
      dotnetChecker,
      DotnetVersion.v31,
      false,
      async (installedDotnetExecPath: string) => {
        // pre-check installed dotnet works
        chai.assert.isTrue(
          await dotnetUtils.hasDotnetVersion(
            installedDotnetExecPath,
            dotnetUtils.dotnetInstallVersion
          )
        );

        // setup config file
        await fs.mkdirp(path.resolve(dotnetUtils.dotnetConfigPath, ".."));
        await fs.writeJson(
          dotnetUtils.dotnetConfigPath,
          { dotnetExecutablePath: installedDotnetExecPath },
          {
            encoding: "utf-8",
            spaces: 4,
            EOL: os.EOL
          }
        );

        const shouldContinue = await checker.resolve();
        const dotnetExecPath = await dotnetChecker.getDotnetExecPath();

        chai.assert.isTrue(shouldContinue);
        assertPathEqual(dotnetExecPath, installedDotnetExecPath);

        chai.assert.isTrue(
          await dotnetUtils.hasDotnetVersion(dotnetExecPath, dotnetUtils.dotnetInstallVersion)
        );
      }
    );
  });

  test("Invalid dotnet.json file and .NET SDK not installed", async function(this: Mocha.Context) {
    if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const invalidPath = "/this/path/does/not/exist";

    // setup config file
    await fs.mkdirp(path.resolve(dotnetUtils.dotnetConfigPath, ".."));
    await fs.writeJson(
      dotnetUtils.dotnetConfigPath,
      { dotnetExecutablePath: invalidPath },
      {
        encoding: "utf-8",
        spaces: 4,
        EOL: os.EOL
      }
    );

    const [checker, dotnetChecker] = createTestChecker(true);
    const shouldContinue = await checker.resolve();
    const dotnetExecPath = await dotnetChecker.getDotnetExecPath();

    chai.assert.isTrue(shouldContinue);
    if (isLinux()) {
      // Don't use assertPathEqual because this path does not exist
      chai.assert.equal(dotnetExecPath, invalidPath);
    } else {
      chai.assert.isNotNull(dotnetExecPath);
      chai.assert.isTrue(
        await dotnetUtils.hasDotnetVersion(dotnetExecPath, dotnetUtils.dotnetInstallVersion)
      );
    }
  });

  test("Invalid dotnet.json file and .NET SDK installed", async function(this: Mocha.Context) {
    if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const [checker, dotnetChecker] = createTestChecker(true);

    await dotnetUtils.withDotnet(
      dotnetChecker,
      DotnetVersion.v31,
      true,
      async (installedDotnetExecPath: string) => {
        const invalidPath = "/this/path/does/not/exist";
        // setup config file
        await fs.mkdirp(path.resolve(dotnetUtils.dotnetConfigPath, ".."));
        await fs.writeJson(
          dotnetUtils.dotnetConfigPath,
          { dotnetExecutablePath: invalidPath },
          {
            encoding: "utf-8",
            spaces: 4,
            EOL: os.EOL
          }
        );

        const shouldContinue = await checker.resolve();
        const dotnetExecPath = await dotnetChecker.getDotnetExecPath();
        const dotnetExecPathFromConfig = await dotnetUtils.getDotnetExecPathFromConfig(
          dotnetUtils.dotnetConfigPath
        );

        chai.assert.isTrue(shouldContinue);
        assertPathEqual(dotnetExecPath, installedDotnetExecPath);
        chai.assert.isNotNull(dotnetExecPathFromConfig);
        assertPathEqual(dotnetExecPath, dotnetExecPathFromConfig!);
        chai.assert.isTrue(
          await dotnetUtils.hasDotnetVersion(dotnetExecPath, dotnetUtils.dotnetInstallVersion)
        );
      }
    );
  });

  teardown(async function(this: Mocha.Context) {
    // cleanup to make sure the environment is clean
    await dotnetUtils.cleanup();
  });
});
