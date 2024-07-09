// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import "mocha";
import * as process from "process";
import * as sinon from "sinon";
import { CheckerFactory } from "../../../../src/component/deps-checker/checkerFactory";
import { DepsChecker, DepsType } from "../../../../src/component/deps-checker/depsChecker";
import {
  DotnetChecker,
  DotnetVersion,
} from "../../../../src/component/deps-checker/internal/dotnetChecker";
import { isLinux, isWindows } from "../../../../src/component/deps-checker/util/system";
import { logger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import {
  assertPathEqual,
  commandExistsInPath,
  getExecutionPolicyForCurrentUser,
  setExecutionPolicyForCurrentUser,
} from "../utils/common";
import * as dotnetUtils from "../utils/dotnet";

describe("DotnetChecker E2E Test - first run", async () => {
  const sandbox = sinon.createSandbox();

  beforeEach(async function () {
    // cleanup to make sure the environment is clean before test
    await dotnetUtils.cleanup();
  });
  afterEach(async function () {
    sandbox.restore();
    // cleanup to make sure the environment is clean
    await dotnetUtils.cleanup();
  });

  it(".NET SDK is not installed, whether globally or in home dir", async function () {
    if (isLinux() || (await commandExistsInPath(dotnetUtils.dotnetCommand))) {
      this.skip();
    }
    const dotnetChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      new TestTelemetry()
    ) as DotnetChecker;

    const depsInfo = await dotnetChecker.getInstallationInfo();
    assert.isNotNull(depsInfo);
    assert.isFalse(depsInfo.isInstalled, ".NET is not installed, but isInstalled() return true");
    assert.isFalse(depsInfo.details.isLinuxSupported, "Linux should not support .NET");

    const spyChecker = sandbox.spy(dotnetChecker, "getInstallationInfo");
    const res = await dotnetChecker.resolve();
    assert.isTrue(res.isInstalled);
    assert.isTrue(spyChecker.calledTwice);
    await verifyPrivateInstallation(dotnetChecker);
  });

  it(".NET SDK is not installed and the user homedir contains special characters", async function () {
    if (isLinux() || (await commandExistsInPath(dotnetUtils.dotnetCommand))) {
      this.skip();
    }

    // test for space and non-ASCII characters
    const specialUserName = "Aarón García";

    const [resourceDir, cleanupCallback] = await dotnetUtils.createMockResourceDir(specialUserName);
    try {
      const dotnetChecker = CheckerFactory.createChecker(
        DepsType.Dotnet,
        logger,
        new TestTelemetry()
      ) as DotnetChecker;
      sinon.stub(dotnetChecker, "getResourceDir").returns(resourceDir);
      const getInstallationInfoSpy = sinon.spy(dotnetChecker, "getInstallationInfo");
      const res = await dotnetChecker.resolve();
      assert.isTrue(res.isInstalled);
      assert.isTrue(getInstallationInfoSpy.calledTwice);
      await verifyPrivateInstallation(dotnetChecker);
    } finally {
      cleanupCallback();
    }
  });

  it(".NET SDK supported version is installed globally", async function () {
    if (
      !(await dotnetUtils.hasAnyDotnetVersions(
        dotnetUtils.dotnetCommand,
        dotnetUtils.dotnetSupportedVersions
      ))
    ) {
      this.skip();
    }

    const dotnetFullPath = await commandExistsInPath(dotnetUtils.dotnetCommand);
    assert.isNotNull(dotnetFullPath);

    const dotnetChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      new TestTelemetry()
    );

    const depsInfo = await dotnetChecker.getInstallationInfo();
    assert.isTrue(depsInfo.isInstalled);

    const dotnetExecPathFromConfig = await dotnetUtils.getDotnetExecPathFromConfig(
      dotnetUtils.dotnetConfigPath
    );
    assert.isNotNull(dotnetExecPathFromConfig);
    assert.isTrue(
      await dotnetUtils.hasAnyDotnetVersions(
        dotnetExecPathFromConfig!,
        dotnetUtils.dotnetSupportedVersions
      )
    );

    // test dotnet executable is from config file.
    assertPathEqual(dotnetExecPathFromConfig!, depsInfo.command);
  });

  it(".NET SDK is too old", async function () {
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
    if (isLinux()) {
      this.skip();
    }

    assert.isTrue(await commandExistsInPath(dotnetUtils.dotnetCommand));

    const dotnetChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      new TestTelemetry()
    ) as DotnetChecker;

    const spyChecker = sandbox.spy(dotnetChecker, "getInstallationInfo");
    const res = await dotnetChecker.resolve();
    assert.isTrue(spyChecker.calledTwice);

    assert.isTrue(res.isInstalled);
    await verifyPrivateInstallation(dotnetChecker);
  });

  it(".NET SDK installation failure and manually install", async function () {
    if (isLinux() || (await commandExistsInPath(dotnetUtils.dotnetCommand))) {
      this.skip();
    }

    // DotnetChecker with mock dotnet-install script
    const dotnetChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      new TestTelemetry()
    ) as DotnetChecker;
    const correctResourceDir = dotnetChecker.getResourceDir();
    sinon.stub(dotnetChecker, "getResourceDir").returns(getErrorResourceDir());

    const res = await dotnetChecker.resolve();

    assert.isFalse(res.isInstalled);
    await verifyInstallationFailed(dotnetChecker);

    sinon.restore();
    // DotnetChecker with correct dotnet-install script
    sinon.stub(dotnetChecker, "getResourceDir").returns(correctResourceDir);

    // user manually install
    await dotnetUtils.withDotnet(
      dotnetChecker,
      dotnetUtils.dotnetInstallVersion,
      true,
      async (installedDotnetExecPath: string) => {
        // pre-check installed dotnet works
        assert.isTrue(
          await dotnetUtils.hasDotnetVersion(
            installedDotnetExecPath,
            dotnetUtils.dotnetInstallVersion
          )
        );

        await dotnetChecker.resolve();
        const depsInfo = await dotnetChecker.getInstallationInfo();
        assert.isTrue(depsInfo.isInstalled);
        const dotnetExecPath = await dotnetChecker.command();
        assertPathEqual(dotnetExecPath, installedDotnetExecPath);
        assert.isTrue(
          await dotnetUtils.hasDotnetVersion(dotnetExecPath, dotnetUtils.dotnetInstallVersion)
        );
      }
    );
  });
});

describe("DotnetChecker E2E Test - second run", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(async function () {
    await dotnetUtils.cleanup();
    // cleanup to make sure the environment is clean before test
  });

  afterEach(async function () {
    // cleanup to make sure the environment is clean
    sandbox.restore();
    await dotnetUtils.cleanup();
  });

  it("Valid dotnet.json file", async function () {
    if (await commandExistsInPath(dotnetUtils.dotnetCommand)) {
      this.skip();
    }

    const dotnetChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      new TestTelemetry()
    ) as DotnetChecker;
    await dotnetUtils.withDotnet(
      dotnetChecker,
      dotnetUtils.dotnetInstallVersion,
      false,
      async (installedDotnetExecPath: string) => {
        // pre-check installed dotnet works
        assert.isTrue(
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
            EOL: os.EOL,
          }
        );

        const spyChecker = sandbox.spy(dotnetChecker, "getInstallationInfo");
        const res = await dotnetChecker.resolve();
        assert.isTrue(spyChecker.calledOnce);

        const dotnetExecPath = await dotnetChecker.command();

        assert.isTrue(res.isInstalled);
        assertPathEqual(dotnetExecPath, installedDotnetExecPath);
        assert.isTrue(
          await dotnetUtils.hasDotnetVersion(dotnetExecPath, dotnetUtils.dotnetInstallVersion)
        );
      }
    );
  });

  it("Invalid dotnet.json file and .NET SDK not installed", async function () {
    if (isLinux() || (await commandExistsInPath(dotnetUtils.dotnetCommand))) {
      this.skip();
    }

    // setup config file
    const invalidPath = "/this/path/does/not/exist";
    await fs.mkdirp(path.resolve(dotnetUtils.dotnetConfigPath, ".."));
    await fs.writeJson(
      dotnetUtils.dotnetConfigPath,
      { dotnetExecutablePath: invalidPath },
      {
        encoding: "utf-8",
        spaces: 4,
        EOL: os.EOL,
      }
    );

    const dotnetChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      new TestTelemetry()
    );
    const spyChecker = sandbox.spy(dotnetChecker, "getInstallationInfo");
    const res = await dotnetChecker.resolve();
    assert.isTrue(spyChecker.calledTwice);

    assert.isTrue(res.isInstalled);
    await verifyPrivateInstallation(dotnetChecker);
  });

  it("Invalid dotnet.json file and .NET SDK installed", async function () {
    if (isLinux() || (await commandExistsInPath(dotnetUtils.dotnetCommand))) {
      this.skip();
    }

    const dotnetChecker = CheckerFactory.createChecker(
      DepsType.Dotnet,
      logger,
      new TestTelemetry()
    ) as DotnetChecker;

    await dotnetUtils.withDotnet(
      dotnetChecker,
      dotnetUtils.dotnetInstallVersion,
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
            EOL: os.EOL,
          }
        );

        const spyChecker = sandbox.spy(dotnetChecker, "getInstallationInfo");
        const res = await dotnetChecker.resolve();
        assert.isTrue(spyChecker.calledOnce);

        const dotnetExecPath = await dotnetChecker.command();
        const dotnetExecPathFromConfig = await dotnetUtils.getDotnetExecPathFromConfig(
          dotnetUtils.dotnetConfigPath
        );

        assert.isTrue(res.isInstalled);
        assertPathEqual(dotnetExecPath, installedDotnetExecPath);
        assert.isNotNull(dotnetExecPathFromConfig);
        assertPathEqual(dotnetExecPath, dotnetExecPathFromConfig!);
        assert.isTrue(
          await dotnetUtils.hasDotnetVersion(dotnetExecPath, dotnetUtils.dotnetInstallVersion)
        );
      }
    );
  });
});

async function verifyPrivateInstallation(dotnetChecker: DepsChecker) {
  const depsInfo = await dotnetChecker.getInstallationInfo();
  assert.isTrue(depsInfo.isInstalled, ".NET installation failed");

  assert.isTrue(
    await dotnetUtils.hasDotnetVersion(depsInfo.command, dotnetUtils.dotnetInstallVersion)
  );

  // validate dotnet config file
  const dotnetExecPath = await dotnetUtils.getDotnetExecPathFromConfig(
    dotnetUtils.dotnetConfigPath
  );
  assert.isNotNull(dotnetExecPath);
  assert.isTrue(
    await dotnetUtils.hasDotnetVersion(dotnetExecPath!, dotnetUtils.dotnetInstallVersion)
  );
}

async function verifyInstallationFailed(dotnetChecker: DepsChecker) {
  const depsInfo = await dotnetChecker.getInstallationInfo();
  assert.isFalse(depsInfo.isInstalled);
  assert.isNull(await dotnetUtils.getDotnetExecPathFromConfig(dotnetUtils.dotnetConfigPath));
  assert.equal(depsInfo.command, dotnetUtils.dotnetCommand);
}

function getErrorResourceDir(): string {
  process.env["ENV_CHECKER_CUSTOM_SCRIPT_STDOUT"] = "mock dotnet installing";
  process.env["ENV_CHECKER_CUSTOM_SCRIPT_STDERR"] = "mock dotnet install failure";
  process.env["ENV_CHECKER_CUSTOM_SCRIPT_EXITCODE"] = "1";
  return path.resolve(__dirname, "../resource");
}
