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
import {
  ArmParameters,
  migrateArm,
  ProjectMigratorMW,
} from "../../src/core/middleware/projectMigrator";
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

  describe("ProjectMigratorMW", () => {
    const sandbox = sinon.createSandbox();
    const appName = randomAppName();
    const projectPath = path.join(os.tmpdir(), appName);

    beforeEach(async () => {
      await fs.ensureDir(projectPath);
      sandbox.stub(MockUserInteraction.prototype, "showMessage").resolves(ok("Upgrade"));
    });

    afterEach(async () => {
      await fs.remove(projectPath);
      sandbox.restore();
      mockedEnvRestore();
    });

    it("successfully migrate to version of arm and multi-env", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
      await fs.copy(path.join(__dirname, "../samples/migration/"), path.join(projectPath));
      const tools = new MockTools();
      setTools(tools);
      class MyClass {
        tools = tools;
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
      inputs.projectPath = projectPath;
      const my = new MyClass();
      try {
        const res = await my.other(inputs);
        assert.isTrue(res.isOk());
        const configDev = await fs.readJson(
          path.join(inputs.projectPath, ".fx", "configs", "config.dev.json")
        );
        assert.isTrue(configDev["skipAddingSqlUser"]);
        assert.isNotNull(configDev["auth"]);
        assert.strictEqual(configDev["auth"]["accessAsUserScopeId"], "test");
        assert.strictEqual(configDev["auth"]["objectId"], "test");
        assert.strictEqual(configDev["auth"]["clientId"], "test");
        assert.strictEqual(configDev["auth"]["clientSecret"], "{{ $env.AAD_APP_CLIENT_SECRET }}");
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });

    it("do not migration with user task getLocalDebugEnvs", async () => {
      await fs.copy(path.join(__dirname, "../samples/migration/"), path.join(projectPath));
      const tools = new MockTools();
      setTools(tools);
      class MyClass {
        tools = tools;
        async executeUserTask(
          func: Func,
          inputs: Inputs,
          ctx?: CoreHookContext
        ): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        executeUserTask: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
      inputs.projectPath = projectPath;
      const my = new MyClass();
      const res = await my.executeUserTask({ method: "getLocalDebugEnvs" } as any, inputs);
      assert.isTrue(res.isOk());
    });

    it("do not migration with method getProjectConfig", async () => {
      await fs.copy(path.join(__dirname, "../samples/migration/"), path.join(projectPath));
      const tools = new MockTools();
      setTools(tools);
      class MyClass {
        tools = tools;
        async getProjectConfig(
          inputs: Inputs,
          ctx?: CoreHookContext
        ): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        getProjectConfig: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
      inputs.projectPath = projectPath;
      const my = new MyClass();
      const res = await my.getProjectConfig(inputs);
      assert.isTrue(res.isOk());
    });

    it("do not migration with no .fx folder", async () => {
      await fs.copy(path.join(__dirname, "../samples/migration/"), path.join(projectPath));
      await fs.remove(path.join(projectPath, ".fx"));
      const tools = new MockTools();
      setTools(tools);
      class MyClass {
        tools = tools;
        async getProjectConfig(
          inputs: Inputs,
          ctx?: CoreHookContext
        ): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        getProjectConfig: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
      inputs.projectPath = projectPath;
      const my = new MyClass();
      const res = await my.getProjectConfig(inputs);
      assert.isTrue(res.isOk());
    });

    it("pre check with error manifest file", async () => {
      await fs.copy(
        path.join(__dirname, "../samples/migrationErrorManifest/"),
        path.join(projectPath)
      );
      setTools(new MockTools());
      class MyClass {
        async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          return ok("");
        }
      }
      hooks(MyClass, {
        other: [ProjectMigratorMW],
      });

      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = projectPath;
      const my = new MyClass();
      try {
        await my.other(inputs);
        assert.fail();
      } catch (e) {
      } finally {
        await fs.rmdir(inputs.projectPath!, { recursive: true });
      }
    });
  });
});
