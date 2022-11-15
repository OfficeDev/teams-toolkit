// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Use require so we can mock it
import fs from "fs-extra";
import * as os from "os";
import mockFs from "mock-fs";
import * as chai from "chai";
import * as path from "path";
import * as nodeUtils from "../utils/node";
import { TestLogger } from "../adapters/testLogger";
import { TestTelemetry } from "../adapters/testTelemetry";
import { DepsType } from "../../../../src/common/deps-checker/depsChecker";
import { CheckerFactory } from "../../../../src/common/deps-checker/checkerFactory";
import "mocha";
import { VxTestAppChecker } from "../../../../src/common/deps-checker/internal/vxTestAppChecker";
import * as sinon from "sinon";
import axios, { AxiosInstance } from "axios";
import { isWindows } from "../../../../src/common/deps-checker/util";
import * as tmp from "tmp";

describe("NodeChecker E2E Test", async () => {
  const fakeProjectPath = "fake project path";
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    mockFs.restore();
  });

  it("VxTestApp already installed", async function () {
    mockFs({
      [path.join(
        fakeProjectPath,
        ".tools",
        "video-extensibility-test-app",
        "video-extensibility-test-app.exe"
      )]: "",
    });
    const checker = new VxTestAppChecker(new TestLogger(), new TestTelemetry());
    const info = await checker.getInstallationInfo({
      projectPath: fakeProjectPath,
      version: "1.0.4",
    });

    chai.assert.isTrue(info.isInstalled);
  });

  it("VxTestApp not installed", async function () {
    // Currently vxTestApp only publishes Windows bits
    if (!isWindows()) {
      return;
    }

    const checker = CheckerFactory.createChecker(
      DepsType.VxTestApp,
      new TestLogger(),
      new TestTelemetry()
    );

    let tmpDir;
    try {
      tmpDir = tmp.dirSync({ unsafeCleanup: true });

      const res = await checker.resolve({ projectPath: tmpDir.name, version: "1.0.4" });
      chai.assert.isTrue(res.isInstalled);
      chai.assert.isTrue(
        fs.pathExistsSync(
          path.resolve(
            tmpDir.name,
            ".tools/video-extensibility-test-app/video-extensibility-test-app.exe"
          )
        )
      );
      const stat = fs.lstatSync(path.resolve(tmpDir.name, ".tools/video-extensibility-test-app"));
      chai.assert.isTrue(stat.isSymbolicLink());
      chai.assert.isTrue(
        fs.pathExistsSync(
          path.resolve(
            os.homedir(),
            ".fx/bin/video-extensibility-test-app/1.0.4/video-extensibility-test-app.exe"
          )
        )
      );
    } finally {
      tmpDir?.removeCallback();
    }
  });
});
