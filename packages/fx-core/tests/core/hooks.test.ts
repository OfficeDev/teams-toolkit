// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, NextFunction } from "@feathersjs/hooks/lib";
import {
  CryptoProvider,
  EnvConfig,
  Err,
  err,
  Func,
  FxError,
  Inputs,
  Ok,
  ok,
  Platform,
  Result,
  SingleSelectConfig,
  SingleSelectResult,
  Stage,
  Tools,
  UserCancelError,
  v3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { environmentManager } from "../../src/core/environment";
import {
  migrateArm,
  ArmParameters,
  ProjectMigratorMW,
} from "../../src/core/middleware/projectMigrator";
import { MockTools, MockUserInteraction, randomAppName } from "./utils";
import { CoreHookContext } from "../../src/core/types";
import { getProjectTemplatesFolderPath } from "../../src/common/utils";
import { setTools } from "../../src/core/globalVars";
import { EnvInfoLoaderMW_V3 } from "../../src/core/middleware/envInfoLoaderV3";
import { EnvInfoV3 } from "@microsoft/teamsfx-api/build/v3";

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
      const identityBicepFilePath = path.join(
        __dirname,
        "../plugins/resource/identity/unit/expectedBicepFiles"
      );
      assert.isTrue(
        await fs.pathExists(
          path.join(await getProjectTemplatesFolderPath(projectPath), "azure", "provision")
        )
      );
      // assert.strictEqual(
      //   await fs.readFile(
      //     path.join(
      //       await getProjectTemplatesFolderPath(projectPath),
      //       "azure",
      //       "provision",
      //       "identity.bicep"
      //     ),
      //     ConstantString.UTF8Encoding
      //   ),
      //   (
      //     await fs.readFile(
      //       path.join(identityBicepFilePath, "identityProvision.result.bicep"),
      //       ConstantString.UTF8Encoding
      //     )
      //   ).replace(/\r?\n/g, os.EOL)
      // );
      // const frontendBicepFilePath = path.join(
      //   __dirname,
      //   "../plugins/resource/frontend/unit/expectedBicepFiles"
      // );
      // assert.isTrue(
      //   await fs.pathExists(
      //     path.join(
      //       await getProjectTemplatesFolderPath(projectPath),
      //       "azure",
      //       "provision",
      //       "frontendHosting.bicep"
      //     )
      //   )
      // );
      // assert.strictEqual(
      //   await fs.readFile(
      //     path.join(
      //       await getProjectTemplatesFolderPath(projectPath),
      //       "azure",
      //       "provision",
      //       "frontendHosting.bicep"
      //     ),
      //     ConstantString.UTF8Encoding
      //   ),
      //   (
      //     await fs.readFile(
      //       path.join(frontendBicepFilePath, "frontendProvision.result.bicep"),
      //       ConstantString.UTF8Encoding
      //     )
      //   ).replace(/\r?\n/g, os.EOL)
      // );
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
  describe("EnvInfoLoaderMW with MultiEnv enabled", () => {
    const expectedResult = "ok";
    const projectPath = "mock/this/does/not/exists";
    let mockedEnvRestore: () => void;
    function MockProjectSettingsLoaderMW() {
      return async (ctx: CoreHookContext, next: NextFunction) => {
        ctx.projectSettings = {
          appName: "testApp",
          version: "1.0",
          projectId: "abcd",
          solutionSettings: {
            name: "fx-solution-azure",
          },
        };
        await next();
      };
    }
    async function SolutionContextSpyMW(ctx: CoreHookContext, next: NextFunction) {
      await next();
      envInfo = ctx.envInfoV3;
    }

    // test variables
    let envInfo: EnvInfoV3 | undefined;
    let envLoaded: string | undefined = undefined;
    beforeEach(() => {
      envInfo = undefined;
      envLoaded = undefined;
      mockedEnvRestore = mockedEnv({});
      // stub environmentManager.loadEnvInfo()
      sandbox
        .stub(environmentManager, "loadEnvInfo")
        .callsFake(
          async (
            projectPath: string,
            cryptoProvider: CryptoProvider,
            maybeEnvName?: string
          ): Promise<Result<v3.EnvInfoV3, FxError>> => {
            const envName = maybeEnvName ?? environmentManager.getDefaultEnvName();
            envLoaded = envName;

            const envConfig: EnvConfig = {
              manifest: {
                appName: {
                  short: "testApp",
                },
              },
            };
            const envState = { solution: {} };
            const envInfo = {
              envName: envName,
              config: envConfig,
              state: envState,
            };
            return ok(envInfo);
          }
        );

      // mock fs.existsSync for EnvInfoLoader
      const originalPathExists = fs.pathExists;
      sandbox.stub(fs, "pathExists").callsFake(async (path: string) => {
        if (path === projectPath) {
          return true;
        } else {
          return originalPathExists(path);
        }
      });
    });
    describe("skipping logic", async () => {
      afterEach(() => {
        mockedEnvRestore();
      });
      it("skips on getQuestions of the create stage", async () => {
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        setTools(new MockTools());
        class MyClass {
          async getQuestions(stage: Stage, inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }

        // Act
        hooks(MyClass, {
          getQuestions: [
            MockProjectSettingsLoaderMW(),
            EnvInfoLoaderMW_V3(true),
            SolutionContextSpyMW,
          ],
        });
        const my = new MyClass();
        const res = await my.getQuestions(Stage.create, inputs);

        // Assert
        assert.isUndefined(envLoaded);
        assert.isTrue(res.isOk());
        assert.isUndefined(envInfo);
      });

      it("skips statically", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        setTools(new MockTools());
        class MyClass {
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW_V3(true), SolutionContextSpyMW],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isUndefined(envLoaded);
        assert.isTrue(res.isOk());
        assert(envInfo);
        // envInfo should be set to a default value when envInfo loading is skipped.
        // assert.equal(envInfo!.envName, environmentManager.getDefaultEnvName());
      });

      it("skips dynamically with inputs.ignoreEnvInfo", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
          ignoreEnvInfo: true,
        };
        setTools(new MockTools());
        class MyClass {
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }

        // Act
        hooks(MyClass, {
          myMethod: [
            MockProjectSettingsLoaderMW(),
            EnvInfoLoaderMW_V3(false),
            SolutionContextSpyMW,
          ],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isUndefined(envLoaded);
        assert.isTrue(res.isOk());
        assert(envInfo);
        // envInfo should be set to a default value when envInfo loading is skipped.
        // assert.equal(envInfo!.envName, environmentManager.getDefaultEnvName());
      });
    });

    describe("using inputs.env", async () => {
      let mockedEnvRestore: RestoreFn;
      afterEach(() => {
        mockedEnvRestore();
      });
      it("accepts inputs.env", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
        // Arrange
        const env = "staging";
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
          env: env,
        };
        setTools(new MockTools());
        class MyClass {
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }
        sandbox
          .stub(environmentManager, "checkEnvExist")
          .callsFake(async (projectPath: string, envName: string) => {
            if (envName === env) {
              return ok(true);
            } else {
              throw new Error("unreachable");
            }
          });

        // Act
        hooks(MyClass, {
          myMethod: [
            MockProjectSettingsLoaderMW(),
            EnvInfoLoaderMW_V3(false),
            SolutionContextSpyMW,
          ],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.equal(envLoaded, env);
        assert.isTrue(res.isOk());
        assert.equal((res as Ok<string, FxError>).value, expectedResult);
        assert(envInfo);
        assert.equal(envInfo!.envName, env);
      });

      it("handles error for non-existent inputs.env", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
        // Arrange
        const nonExistentEnvName = "nonExistentEnvName";
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
          env: nonExistentEnvName,
        };
        setTools(new MockTools());
        class MyClass {
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }
        sandbox
          .stub(environmentManager, "checkEnvExist")
          .callsFake(async (projectPath: string, env: string) => {
            if (env === nonExistentEnvName) {
              return ok(false);
            } else {
              throw new Error("unreachable");
            }
          });

        // Act
        hooks(MyClass, {
          myMethod: [
            MockProjectSettingsLoaderMW(),
            EnvInfoLoaderMW_V3(false),
            SolutionContextSpyMW,
          ],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isTrue(res.isErr());
        assert.equal((res as Err<string, FxError>).error.name, "FileNotFoundError");
        assert(!envInfo);
      });
    });

    describe("asking env interactively", async () => {
      let mockedEnvRestore: RestoreFn;
      afterEach(() => {
        mockedEnvRestore();
      });
      it("asks env interactively and put the last used env first", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        let envs = ["staging", "e2e", "test"];
        class MockUserInteractionSelectFirst extends MockUserInteraction {
          public async selectOption(
            config: SingleSelectConfig
          ): Promise<Result<SingleSelectResult, FxError>> {
            if (config.options.length === 0) {
              throw new Error("There is no options to select");
            }
            return ok({ type: "success", result: config.options[0] });
          }
        }
        const tools = new MockTools();
        tools.ui = new MockUserInteractionSelectFirst();
        setTools(tools);
        class MyClass {
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }
        sandbox
          .stub(environmentManager, "listRemoteEnvConfigs")
          .callsFake(async (projectPath: string) => {
            return ok(envs);
          });
        sandbox
          .stub(environmentManager, "checkEnvExist")
          .callsFake(async (projectPath: string, env: string) => {
            return ok(envs.includes(env));
          });

        // Act
        hooks(MyClass, {
          myMethod: [
            MockProjectSettingsLoaderMW(),
            EnvInfoLoaderMW_V3(false),
            SolutionContextSpyMW,
          ],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        // mock question model always returns the first option
        assert.equal(envLoaded, envs[0]);
        assert.isTrue(res.isOk());
        assert.equal((res as Ok<string, FxError>).value, expectedResult);
        assert(envInfo);
        assert.equal(envInfo?.envName, envs[0]);

        // Arrange
        // reorder envs to check whether the lastUsedEnv appears first
        envs = [envs[2], ...envs.slice(0, 2)];

        // Act
        hooks(MyClass, {
          myMethod: [
            MockProjectSettingsLoaderMW(),
            EnvInfoLoaderMW_V3(false),
            SolutionContextSpyMW,
          ],
        });

        // Assert
        const res2 = await my.myMethod(inputs);
        assert.equal(envLoaded, envs[1]);
        assert.isTrue(res2.isOk());
        assert.equal((res2 as Ok<string, FxError>).value, expectedResult);
        assert(envInfo);
        assert.equal(envInfo?.envName, envs[1]);
      });

      it("handles user canceling", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        const envs = ["staging", "e2e", "test"];
        class MockUserInteractionSelectFirst extends MockUserInteraction {
          public async selectOption(
            config: SingleSelectConfig
          ): Promise<Result<SingleSelectResult, FxError>> {
            return err(UserCancelError);
          }
        }
        const tools = new MockTools();
        setTools(tools);
        tools.ui = new MockUserInteractionSelectFirst();
        class MyClass {
          tools: Tools = tools;
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }
        sandbox
          .stub(environmentManager, "listRemoteEnvConfigs")
          .callsFake(async (projectPath: string) => {
            return ok(envs);
          });

        // Act
        hooks(MyClass, {
          myMethod: [MockProjectSettingsLoaderMW(), EnvInfoLoaderMW_V3(false)],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        // mock question model always returns the first option
        assert.isTrue(res.isErr());
        assert.equal((res as Err<string, FxError>).error.name, "UserCancel");
      });
    });

    describe("order of precedence", async () => {
      let tools: Tools;
      const inputsEnv = "inputs";
      const askUserEnv = "askUser";
      const envs = [inputsEnv, askUserEnv];
      let mockedEnvRestore: RestoreFn;
      class MyClass {
        tools: Tools = tools;
        async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
          return ok(expectedResult);
        }
      }
      beforeEach(async () => {
        class MockUserInteractionSelectFirst extends MockUserInteraction {
          public async selectOption(
            config: SingleSelectConfig
          ): Promise<Result<SingleSelectResult, FxError>> {
            return ok({ type: "success", result: askUserEnv });
          }
        }
        tools = new MockTools();
        setTools(tools);
        tools.ui = new MockUserInteractionSelectFirst();

        sandbox
          .stub(environmentManager, "listRemoteEnvConfigs")
          .callsFake(async (projectPath: string) => {
            return ok(envs);
          });
        sandbox.stub(environmentManager, "checkEnvExist").returns(Promise.resolve(ok(true)));
      });
      afterEach(() => {
        mockedEnvRestore();
      });

      it("prefers inputs.env than asking user", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
          env: inputsEnv,
        };

        // Act
        hooks(MyClass, {
          myMethod: [
            MockProjectSettingsLoaderMW(),
            EnvInfoLoaderMW_V3(false),
            SolutionContextSpyMW,
          ],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isTrue(res.isOk());
        assert.equal((res as Ok<string, FxError>).value, expectedResult);
        assert(envInfo);
        assert.equal(envLoaded, inputsEnv);
        assert.equal(envInfo?.envName, inputsEnv);
      });
    });

    describe("error handling", async () => {
      let mockedEnvRestore: RestoreFn;
      afterEach(() => {
        mockedEnvRestore();
      });
      // Test cases for error handling
      it("handles error when project settings is undefined", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
        // Arrange
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: projectPath,
        };
        const tools = new MockTools();
        setTools(tools);
        class MyClass {
          tools = tools;
          async myMethod(inputs: Inputs): Promise<Result<string, FxError>> {
            return ok(expectedResult);
          }
        }

        // Act
        hooks(MyClass, {
          myMethod: [EnvInfoLoaderMW_V3(false)],
        });
        const my = new MyClass();
        const res = await my.myMethod(inputs);

        // Assert
        assert.isTrue(res.isErr());
        assert.equal((res as Err<string, FxError>).error.name, "ProjectSettingsUndefinedError");
      });
    });
  });
});
