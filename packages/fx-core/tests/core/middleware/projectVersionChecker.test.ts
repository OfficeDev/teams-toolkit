// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Inputs, ok, Platform, ProjectSettings, Result } from "@microsoft/teamsfx-api";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { setTools } from "../../../src";
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import { ProjectVersionCheckerMW } from "../../../src/core/middleware/projectVersionChecker";
import { assert } from "chai";

describe("Middleware - projectVersionChecker.test", () => {
  const sandbox = sinon.createSandbox();
  let mockTools: MockTools;
  beforeEach(function () {
    mockTools = new MockTools();
    setTools(mockTools);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("doesn't show update dialog or message", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [ProjectVersionCheckerMW],
    });
    const appName = randomAppName();
    const projectSettings: ProjectSettings = MockProjectSettings(appName);
    projectSettings.version = "2.1.0";
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSettings));

    const showMessageFunc = sandbox.stub(mockTools.ui, "showMessage");
    const showLog = sandbox.stub(mockTools.logProvider, "warning");

    const my = new MyClass();
    // no project
    const inputs1: Inputs = { platform: Platform.VSCode };
    await my.myMethod(inputs1);
    const inputs2: Inputs = {
      platform: Platform.CLI,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    await my.myMethod(inputs2);
    assert.isTrue(showMessageFunc.callCount === 0);
    assert.isTrue(showLog.callCount === 0);
  });

  it("Show update dialog or message", async () => {
    const appName = randomAppName();
    const projectSettings: ProjectSettings = MockProjectSettings(appName);
    projectSettings.version = "3.0.0";
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSettings));

    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [ProjectVersionCheckerMW],
    });

    const showMessageFunc = sandbox.stub(mockTools.ui, "showMessage");
    const showLog = sandbox.stub(mockTools.logProvider, "warning");

    const my = new MyClass();
    const inputs1: Inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), appName),
    };
    await my.myMethod(inputs1);
    const inputs2: Inputs = {
      platform: Platform.CLI,
      projectPath: path.join(os.tmpdir(), appName),
    };
    await my.myMethod(inputs2);

    assert.isTrue(showMessageFunc.calledOnce);
    assert.isTrue(showLog.calledOnce);
  });
});
