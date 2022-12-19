// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Inputs, ok, Platform, ProjectSettings, Result } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { AadManifestMigrationMW } from "../../../src/core/middleware/aadManifestMigration";
import { MockTools, randomAppName } from "../utils";
import * as tool from "../../../src/common/tools";
import { permissionsToRequiredResourceAccess } from "../../../src/core/middleware/utils/MigrationUtils";
import * as chai from "chai";
import { setTools } from "../../../src/core/globalVars";

describe("Middleware - aadManifestMigration.test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    sandbox.stub<any, any>(tool, "isAadManifestEnabled").returns(true);
    sandbox.stub<any, any>(fs, "writeJSON").resolves();
    sandbox.stub<any, any>(fs, "ensureDir").resolves();
    sandbox.stub<any, any>(fs, "writeJson").resolves();
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

      if (path.endsWith("manifest.template.json")) {
        return true;
      }

      return false;
    });
    sandbox.stub<any, any>(fs, "readJson").callsFake(async (path: string) => {
      if (path.endsWith("projectSettings.json")) {
        return {
          solutionSettings: {
            capabilities: ["Tab", "Bot"],
            activeResourcePlugins: ["fx-resource-aad-app-for-teams"],
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
      return null;
    });
    setTools(new MockTools());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("migration 2", async () => {
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
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    await my.myMethod(inputs1);
  });

  it("permissionsToRequiredResourceAccess", async () => {
    const permissions = [
      {
        resource: "Microsoft Graph",
        delegated: ["User.Read"],
        application: [],
      },
    ];
    const res = permissionsToRequiredResourceAccess(permissions);
    chai.assert.isNotEmpty(res);
  });
});
