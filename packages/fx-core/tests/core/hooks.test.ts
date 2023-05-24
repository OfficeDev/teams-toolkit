// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Func, FxError, Inputs, ok, Platform, Result } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { getProjectTemplatesFolderPath } from "../../src/common/utils";
import { environmentManager } from "../../src/core/environment";
import { setTools } from "../../src/core/globalVars";
import { ArmParameters, migrateArm } from "../../src/core/middleware/projectMigrator";
import { CoreHookContext } from "../../src/core/types";
import { MockTools, MockUserInteraction, randomAppName } from "./utils";

let mockedEnvRestore: () => void;
describe("Middleware - others", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {});
  afterEach(() => {
    sandbox.restore();
  });

  describe("migrateArm success", () => {
    const sandbox = sinon.createSandbox();
    const projectPath = "MigrationArmSuccessTestSample";
    beforeEach(async () => {
      await fs.ensureDir(projectPath);
      await fs.ensureDir(path.join(projectPath, ".fx"));
      sandbox.stub(environmentManager, "listRemoteEnvConfigs").resolves(ok(["dev"]));
      sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
    });
    afterEach(async () => {
      await fs.remove(projectPath);
      sandbox.restore();
      mockedEnvRestore();
    });
    it("successfully migrate arm templates only tab", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMSFX_V3: "false",
      });
      await fs.copy(
        path.join(__dirname, "../samples/migrationV1Tab/.fx/env.default.json"),
        path.join(projectPath, ".fx", "env.default.json")
      );
      await fs.copy(
        path.join(__dirname, "../samples/migrationV1Tab/.fx/settings.json"),
        path.join(projectPath, ".fx", "settings.json")
      );
      const tools = new MockTools();
      setTools(tools);
      class MyClass {
        tools = tools;
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [migrateArm],
      });
      const my = new MyClass();
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: projectPath,
        ignoreEnvInfo: true,
      };
      await my.other(inputs);
      assert.isTrue(await fs.pathExists(path.join(projectPath, ".fx", "configs")));
      assert.isTrue(
        await fs.pathExists(path.join(projectPath, ".fx", "configs", "azure.parameters.dev.json"))
      );
      assert.isTrue(
        await fs.pathExists(path.join(await getProjectTemplatesFolderPath(projectPath), "azure"))
      );
      assert.isTrue(
        await fs.pathExists(
          path.join(await getProjectTemplatesFolderPath(projectPath), "azure", "main.bicep")
        )
      );
      assert.isTrue(
        await fs.pathExists(
          path.join(await getProjectTemplatesFolderPath(projectPath), "azure", "provision")
        )
      );
    });

    it("successfully migration arm templates", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMSFX_V3: "false",
      });
      await fs.copy(
        path.join(__dirname, "../samples/migration/.fx/env.default.json"),
        path.join(projectPath, ".fx", "env.default.json")
      );
      await fs.copy(
        path.join(__dirname, "../samples/migration/.fx/settings.json"),
        path.join(projectPath, ".fx", "settings.json")
      );
      class MyClass {
        tools = new MockTools();
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [migrateArm],
      });
      const my = new MyClass();
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: projectPath,
        ignoreEnvInfo: true,
      };
      await my.other(inputs);
      assert.isTrue(await fs.pathExists(path.join(projectPath, ".fx", "configs")));
      assert.isTrue(
        await fs.pathExists(path.join(projectPath, ".fx", "configs", "azure.parameters.dev.json"))
      );
      assert.isTrue(
        await fs.pathExists(path.join(await getProjectTemplatesFolderPath(projectPath), "azure"))
      );
      assert.isTrue(
        await fs.pathExists(
          path.join(await getProjectTemplatesFolderPath(projectPath), "azure", "main.bicep")
        )
      );
      assert.isTrue(
        await fs.pathExists(
          path.join(await getProjectTemplatesFolderPath(projectPath), "azure", "provision")
        )
      );
      assert.isTrue(
        await fs.pathExists(
          path.join(await getProjectTemplatesFolderPath(projectPath), "azure", "teamsFx")
        )
      );
      const armParam = await fs.readJson(
        path.join(projectPath, ".fx", "configs", "azure.parameters.dev.json")
      );
      assert.isNotNull(armParam.parameters.resourceBaseName);
      assert.isNotNull(armParam.parameters.azureSql_admin);
      const parameterObj = armParam.parameters.provisionParameters.value;
      assert.isNotNull(parameterObj);
      assert.strictEqual(parameterObj[ArmParameters.FEStorageName], "test");
      assert.strictEqual(parameterObj[ArmParameters.IdentityName], "test");
      assert.strictEqual(parameterObj[ArmParameters.SQLServer], "test");
      assert.strictEqual(parameterObj[ArmParameters.SQLDatabase], "test");
      assert.strictEqual(parameterObj[ArmParameters.functionServerName], "test");
      assert.strictEqual(parameterObj[ArmParameters.functionStorageName], "test");
      assert.strictEqual(parameterObj[ArmParameters.functionAppName], "test");
      assert.strictEqual(parameterObj[ArmParameters.ApimServiceName], "test");
      assert.strictEqual(parameterObj[ArmParameters.ApimProductName], "test");
      assert.strictEqual(parameterObj[ArmParameters.ApimOauthServerName], "test");
    });
  });
});
