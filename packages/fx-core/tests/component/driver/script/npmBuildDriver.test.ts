// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as tools from "../../../../src/common/tools";
import * as utils from "../../../../src/component/code/utils";
import { TestAzureAccountProvider } from "../../util/azureAccountMock";
import { TestLogProvider } from "../../util/logProviderMock";
import { DriverContext } from "../../../../src/component/driver/interface/commonArgs";
import {
  NpmBuildDriver,
  NpmBuildDriverImpl,
} from "../../../../src/component/driver/script/npmBuildDriver";
import { assert } from "chai";
import { MockTelemetryReporter, MockUserInteraction } from "../../../core/utils";
import * as os from "os";
import * as uuid from "uuid";
import * as path from "path";
import * as fs from "fs-extra";

describe("NPM Build Driver test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "waitSeconds").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("NPM build happy path", async () => {
    const driver = new NpmBuildDriver();
    const args = {
      workingDirectory: "./",
      args: "build",
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      ui: new MockUserInteraction(),
      projectPath: "./",
    } as DriverContext;
    sandbox.stub(utils, "execute").resolves();
    const res = await driver.run(args, context);
    chai.assert.equal(res.isOk(), true);
  });

  it("Dotnet build error", async () => {
    const driver = new NpmBuildDriver();
    const args = {
      workingDirectory: "./",
      args: "build",
      env: { a: "HELLO" },
    };
    const context = {
      azureAccountProvider: new TestAzureAccountProvider(),
      logProvider: new TestLogProvider(),
      projectPath: "./",
    } as DriverContext;
    sandbox.stub(utils, "execute").throws(new Error("error"));
    const res = await driver.run(args, context);
    assert.equal(res.isErr(), true);
  });

  it("telemetry for package json", async () => {
    const sysTmp = os.tmpdir();
    const folder = uuid.v4();
    const testFolder = path.join(sysTmp, folder);
    fs.ensureDirSync(testFolder);
    await fs.writeJSON(path.join(testFolder, "package.json"), {
      devDependencies: {
        "@types/chai": "^4.2.14",
      },
      dependencies: {
        "@microsoft/teamsfx-js": "^0.22.0",
      },
    });
    const reporter = new MockTelemetryReporter();
    const save = sandbox.stub(reporter, "sendTelemetryEvent");
    await NpmBuildDriverImpl.telemetryForPackageVersion(
      testFolder,
      reporter,
      new TestLogProvider()
    );
    sinon.assert.calledWith(save, "package-version", {
      "@microsoft/teamsfx-js": "^0.22.0",
    });
    fs.rmSync(testFolder, { recursive: true, force: true });
  });

  it("telemetry error", async () => {
    const reporter = new MockTelemetryReporter();
    sandbox.stub(reporter, "sendTelemetryEvent").throws(new Error("error"));
    sandbox.stub(fs, "existsSync").returns(true);
    sandbox.stub(fs, "readJSON").throws(new Error("error"));
    const logger = new TestLogProvider();
    const save = sandbox.stub(logger, "debug");
    await NpmBuildDriverImpl.telemetryForPackageVersion("./", reporter, logger);
    sinon.assert.called(save);
  });
});
