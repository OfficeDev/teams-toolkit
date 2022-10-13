// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Inputs, ok, Platform, ProjectSettings, Result } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { setTools } from "../../../src/core/globalVars";
import { AadManifestMigrationMW } from "../../../src/core/middleware/aadManifestMigration";
import { MockProjectSettings, MockTools, MockUserInteraction, randomAppName } from "../utils";
import * as projectSettingsLoader from "../../../src/core/middleware/projectSettingsLoader";
import * as tool from "../../../src/common/tools";
import { PluginNames } from "../../../src/component/constants";

describe("Middleware - aadManifestMigration.test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    sandbox.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    sandbox.stub<any, any>(fs, "writeJSON").resolves();
    sandbox.stub<any, any>(fs, "ensureDir").resolves();
    sandbox.stub<any, any>(fs, "pathExists").callsFake(async (path: string) => {
      if (path.endsWith(".fx")) {
        return true;
      }

      if (path.endsWith("config.local.json")) {
        return true;
      }

      if (path.endsWith("permissions.json")) {
        return true;
      }

      return false;
    });
    setTools(new MockTools());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("not migration", async () => {
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [AadManifestMigrationMW],
    });
    const my = new MyClass();
    // no project
    const inputs1: Inputs = { platform: Platform.VSCode };
    await my.myMethod(inputs1);

    sandbox.stub<any, any>(fs, "readJson").callsFake(async (path: string) => {
      if (path.endsWith("projectSettings.json")) {
        return {
          solutionSettings: {
            activeResourcePlugins: [],
          },
        };
      }
      return null;
    });
    const inputs2: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    await my.myMethod(inputs2);
  });

  it("aad manifest migration happy path", async () => {
    sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("Upgrade"));
    const appName = randomAppName();
    const projectSettings: ProjectSettings = MockProjectSettings(appName);
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSettings));
    sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "move").resolves();
    sandbox.stub<any, any>(fs, "readJson").callsFake(async (path: string) => {
      if (path.endsWith("projectSettings.json")) {
        return {
          solutionSettings: {
            activeResourcePlugins: [PluginNames.AAD],
            capabilities: [],
          },
        };
      }

      if (path.endsWith("permissions.json")) {
        return [
          {
            resource: "Microsoft Graph",
            delegated: ["User.Read"],
            application: [],
          },
        ];
      }
      return {};
    });

    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [AadManifestMigrationMW],
    });

    const my = new MyClass();
    const inputs1: Inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), appName),
    };
    await my.myMethod(inputs1);
    const inputs2: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: path.join(os.tmpdir(), appName),
    };
    await my.myMethod(inputs2);
  });
});
