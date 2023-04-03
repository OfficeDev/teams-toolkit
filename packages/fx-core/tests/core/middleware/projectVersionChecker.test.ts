// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { setTools } from "../../../src/core/globalVars";
import { MockTools, randomAppName } from "../utils";
import { ProjectVersionCheckerMW } from "../../../src/core/middleware/projectVersionChecker";
import { assert } from "chai";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as v3MigrationUtils from "../../../src/core/middleware/utils/v3MigrationUtils";
import { MetadataV2, MetadataV3, VersionSource } from "../../../src/common/versionMetadata";

describe("Middleware - projectVersionChecker.test", () => {
  const sandbox = sinon.createSandbox();
  let mockTools: MockTools;
  let mockedEnvRestore: RestoreFn;
  beforeEach(function () {
    mockTools = new MockTools();
    setTools(mockTools);
    mockedEnvRestore = mockedEnv({});
  });

  afterEach(function () {
    sandbox.restore();
    mockedEnvRestore();
  });

  // To be removed after TEAMSFX_V3 feature flag is cleaned up
  it("doesn't show update dialog or message", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [ProjectVersionCheckerMW],
    });
    sandbox.stub(v3MigrationUtils, "getProjectVersion").resolves({
      version: MetadataV2.projectMaxVersion,
      source: VersionSource.projectSettings,
    });

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
  // To be removed after TEAMSFX_V3 feature flag is cleaned up
  it("Show update dialog or message", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const appName = randomAppName();
    sandbox.stub(v3MigrationUtils, "getProjectVersion").resolves({
      version: MetadataV3.projectVersion,
      source: VersionSource.teamsapp,
    });

    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [ProjectVersionCheckerMW],
    });

    const showMessageFunc = sandbox.stub(mockTools.ui, "showMessage").resolves(ok("Learn more"));
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

  it("doesn't show update dialog or message in V3", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
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
    } finally {
      restore();
    }
  });

  it("Show update dialog or message in V3", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const appName = randomAppName();
      sandbox.stub(v3MigrationUtils, "getProjectVersion").resolves({
        version: "2.0.0",
        source: VersionSource.teamsapp,
      });

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
    } finally {
      restore();
    }
  });
});
