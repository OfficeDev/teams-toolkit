// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { err, FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { MetadataV2, VersionSource } from "../../../src/common/versionMetadata";
import { setTools } from "../../../src/common/globalVars";
import { moreInfoButton } from "../../../src/core/middleware/projectMigratorV3";
import { ProjectVersionCheckerMW } from "../../../src/core/middleware/projectVersionChecker";
import * as v3MigrationUtils from "../../../src/core/middleware/utils/v3MigrationUtils";
import { MockTools, MockUserInteraction, randomAppName } from "../utils";
import { UserCancelError } from "../../../src/error";

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

  it("doesn't show update dialog or message in V3", async () => {
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
    }
  });
  it("Show message in V3 cli", async () => {
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

      const my = new MyClass();
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await my.myMethod(inputs);
      assert.isTrue(res.isErr());
    } finally {
    }
  });

  it("Show update dialog in V3 vscode", async () => {
    try {
      const appName = randomAppName();
      sandbox.stub(MockUserInteraction.prototype, "openUrl").resolves(ok(true));
      sandbox.stub(mockTools.ui, "showMessage").resolves(ok(moreInfoButton()));
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

      const my = new MyClass();
      const inputs1: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await my.myMethod(inputs1);
      assert.isTrue(res.isErr());
    } finally {
    }
  });

  it("Show update dialog in V3 vscode - error", async () => {
    try {
      const appName = randomAppName();
      sandbox.stub(MockUserInteraction.prototype, "openUrl").resolves(ok(true));
      sandbox.stub(mockTools.ui, "showMessage").resolves(err(new UserCancelError("mock")));
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

      const my = new MyClass();
      const inputs1: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await my.myMethod(inputs1);
      assert.isTrue(res.isErr());
    } finally {
    }
  });

  it("Show update dialog in V3 vscode - undefined", async () => {
    try {
      const appName = randomAppName();
      sandbox.stub(MockUserInteraction.prototype, "openUrl").resolves(ok(true));
      sandbox.stub(mockTools.ui, "showMessage").resolves(ok(undefined));
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

      const my = new MyClass();
      const inputs1: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await my.myMethod(inputs1);
      assert.isTrue(res.isErr());
    } finally {
    }
  });

  it("Show update dialog in V3 vs", async () => {
    try {
      const appName = randomAppName();
      sandbox.stub(MockUserInteraction.prototype, "openUrl").resolves(ok(true));
      sandbox.stub(mockTools.ui, "showMessage").resolves(ok(moreInfoButton()));
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

      const my = new MyClass();
      const inputs: Inputs = {
        platform: Platform.VS,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await my.myMethod(inputs);
      assert.isTrue(res.isErr());
    } finally {
    }
  });

  it("Show update dialog in V3 vs - error", async () => {
    try {
      const appName = randomAppName();
      sandbox.stub(MockUserInteraction.prototype, "openUrl").resolves(ok(true));
      sandbox.stub(mockTools.ui, "showMessage").resolves(err(new UserCancelError("mock")));
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

      const my = new MyClass();
      const inputs: Inputs = {
        platform: Platform.VS,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await my.myMethod(inputs);
      assert.isTrue(res.isErr());
    } finally {
    }
  });

  it("Show update dialog in V3 vs - undefined", async () => {
    try {
      const appName = randomAppName();
      sandbox.stub(MockUserInteraction.prototype, "openUrl").resolves(ok(true));
      sandbox.stub(mockTools.ui, "showMessage").resolves(ok(undefined));
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

      const my = new MyClass();
      const inputs: Inputs = {
        platform: Platform.VS,
        projectPath: path.join(os.tmpdir(), appName),
      };
      const res = await my.myMethod(inputs);
      assert.isTrue(res.isErr());
    } finally {
    }
  });
});
