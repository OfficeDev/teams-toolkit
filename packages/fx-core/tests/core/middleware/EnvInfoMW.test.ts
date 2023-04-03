// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ConfigFolderName,
  ConfigMap,
  FxError,
  InputConfigsFolderName,
  Inputs,
  ok,
  Platform,
  ProjectSettings,
  ProjectSettingsFileName,
  Result,
  v2,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import * as dotenv from "dotenv";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { LocalCrypto } from "../../../src/core/crypto";
import { EnvInfoLoaderMW_V3 } from "../../../src/core/middleware/envInfoLoaderV3";
import { CoreHookContext } from "../../../src/core/types";
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
import * as envInfoLoader from "../../../src/core/middleware/envInfoLoaderV3";
import { newProjectSettingsV3 } from "../../../src/component/utils";
import {
  newSolutionContext,
  ProjectSettingsLoaderMW,
} from "../../../src/core/middleware/projectSettingsLoader";
import { setTools } from "../../../src/core/globalVars";
import { environmentManager, newEnvInfo, newEnvInfoV3 } from "../../../src/core/environment";
import { ErrorHandlerMW } from "../../../src/core/middleware/errorHandler";
import { ContextInjectorMW } from "../../../src/core/middleware/contextInjector";
import { ProjectSettingsWriterMW } from "../../../src/core/middleware/projectSettingsWriter";
import { EnvInfoWriterMW } from "../../../src/core/middleware/envInfoWriter";
import mockedEnv, { RestoreFn } from "mocked-env";
describe("Middleware - EnvInfoWriterMW, EnvInfoLoaderMW", async () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn;
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("successfully write EnvInfo and load it with encrypting and decrypting userdata", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const appName = randomAppName();
    const inputs: Inputs = { platform: Platform.VSCode };
    const projectPath = path.join(os.tmpdir(), appName);
    inputs.projectPath = projectPath;

    const projectSettings = MockProjectSettings(appName);
    const cryptoProvider = new LocalCrypto(projectSettings.projectId);

    const tools = new MockTools();
    setTools(tools);
    tools.cryptoProvider = cryptoProvider;

    const solutionContext = await newSolutionContext(tools, inputs);
    const configMap = new ConfigMap();
    const pluginName = "aad-app";
    const secretName = "clientSecret";
    const secretText = "test";
    configMap.set(secretName, secretText);
    solutionContext.envInfo.state.set("solution", new ConfigMap());
    solutionContext.envInfo.state.set(pluginName, configMap);

    solutionContext.projectSettings = projectSettings;
    solutionContext.cryptoProvider = cryptoProvider;

    const contextV2: v2.Context = {
      userInteraction: tools.ui,
      logProvider: tools.logProvider,
      telemetryReporter: tools.telemetryReporter!,
      cryptoProvider: cryptoProvider,
      permissionRequestProvider: tools.permissionRequestProvider,
      projectSetting: projectSettings,
    };
    const envInfoV1 = newEnvInfo();
    envInfoV1.state = solutionContext.envInfo.state;
    const envInfoV2: v2.EnvInfoV2 = {
      envName: envInfoV1.envName,
      config: envInfoV1.config,
      state: {},
    };
    for (const key of envInfoV1.state.keys()) {
      const map = envInfoV1.state.get(key) as ConfigMap;
      const value = map?.toJSON();
      if (value) {
        envInfoV2.state[key] = value;
      }
    }
    class MyClass {
      tools = tools;
      async setEnvInfoIntoContext(
        inputs: Inputs,
        ctx?: CoreHookContext
      ): Promise<Result<any, FxError>> {
        if (ctx) {
          ctx.projectSettings = projectSettings;
          ctx.contextV2 = contextV2;
          ctx.envInfoV2 = envInfoV2;
        }
        return ok("");
      }
      async getContext(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        return ok(ctx);
      }
    }

    hooks(MyClass, {
      setEnvInfoIntoContext: [
        ErrorHandlerMW,
        ContextInjectorMW,
        ProjectSettingsWriterMW,
        EnvInfoWriterMW(),
      ],
      getContext: [
        ErrorHandlerMW,
        ProjectSettingsLoaderMW,
        envInfoLoader.EnvInfoLoaderMW_V3(false),
        ContextInjectorMW,
      ],
    });
    const fileMap = new Map<string, any>();
    sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, data: any) => {
      fileMap.set(file, data);
    });
    sandbox.stub(fs, "pathExists").resolves(true);
    const envName = environmentManager.getDefaultEnvName();
    const envConfigFile = environmentManager.getEnvConfigPath(envName, projectPath);
    const envFiles = environmentManager.getEnvStateFilesPath(envName, projectPath);
    const userdataFile = envFiles.userDataFile;
    const envJsonFile = envFiles.envState;
    const confFolderPath = path.resolve(projectPath, `.${ConfigFolderName}`);
    const settingsFiles = [
      path.resolve(confFolderPath, "settings.json"),
      path.resolve(confFolderPath, InputConfigsFolderName, ProjectSettingsFileName),
    ];
    const my = new MyClass();
    const setRes = await my.setEnvInfoIntoContext(inputs);
    assert.isTrue(setRes.isOk());
    const content = fileMap.get(userdataFile);
    assert.isTrue(content !== undefined);
    const userdata = dotenv.parse(content);
    const secretValue = userdata["fx-resource-aad-app-for-teams.clientSecret"];
    assert.isTrue(secretValue.startsWith("crypto_"));
    const decryptedRes = cryptoProvider.decrypt(secretValue);
    assert.isTrue(decryptedRes.isOk() && decryptedRes.value === secretText);
    sandbox.stub<any, any>(fs, "readJson").callsFake(async (file: string) => {
      if (envJsonFile === file) return JSON.parse(fileMap.get(envJsonFile));
      if (settingsFiles.includes(file)) return JSON.parse(fileMap.get(file));
      if (envConfigFile === file) return envInfoV1.config;
      return {};
    });
    sandbox.stub<any, any>(fs, "readFile").callsFake(async (file: string) => {
      if (userdataFile === file) return content;
      if (envJsonFile === file) return fileMap.get(envJsonFile);
      if (envConfigFile === file) return JSON.stringify(envInfoV1.config);
      return {};
    });
    const configsFolder = environmentManager.getEnvConfigsFolder(projectPath);
    sandbox.stub<any, any>(fs, "readdir").callsFake(async (file: string) => {
      if (configsFolder === file) return [`config.${envName}.json`];
      return [];
    });
    inputs.env = envName;
    const getRes = await my.getContext(inputs);
    assert.isTrue(getRes.isOk());
    if (getRes.isOk()) {
      const ctx: CoreHookContext = getRes.value as CoreHookContext;
      assert.isTrue(ctx !== undefined);
      if (ctx) {
        assert.isTrue(
          ctx.envInfoV3 &&
            ctx.envInfoV3.state &&
            ctx.envInfoV3.state[pluginName][secretName] === secretText
        );
      }
    }
  });

  it("newEnvInfoV3()", async () => {
    newEnvInfoV3();
  });

  it("EnvInfoLoaderMW_V3()", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const tools = new MockTools();
    setTools(tools);
    const projectSettings = newProjectSettingsV3();
    sandbox.stub(fs, "readJson").resolves(projectSettings);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(envInfoLoader, "getTargetEnvName").resolves(ok("dev"));
    const envInfo = newEnvInfoV3();
    envInfo.state.solution = { programmingLanguage: "javascript", defaultFunctionName: "myFunc" };
    sandbox.stub(environmentManager, "loadEnvInfo").resolves(ok(envInfo));
    sandbox.stub(environmentManager, "listRemoteEnvConfigs").resolves(ok(["dev"]));
    class MyClass {
      tools = tools;
      async getProjectSettings(
        inputs: Inputs,
        ctx?: CoreHookContext
      ): Promise<Result<ProjectSettings, FxError>> {
        return ok(ctx!.projectSettings!);
      }
    }
    hooks(MyClass, {
      getProjectSettings: [ProjectSettingsLoaderMW, EnvInfoLoaderMW_V3(false), ContextInjectorMW],
    });
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode, projectPath: "." };
    const res = await my.getProjectSettings(inputs);
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      const value = res.value;
      assert.isDefined(value.programmingLanguage);
      assert.isDefined(value.defaultFunctionName);
    }
  });
});
