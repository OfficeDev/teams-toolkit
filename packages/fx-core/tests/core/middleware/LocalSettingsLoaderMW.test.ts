// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  ConfigFolderName,
  FxError,
  InputConfigsFolderName,
  Inputs,
  ok,
  Platform,
  ProjectSettingsFileName,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import {
  CoreHookContext,
  isV2,
  LocalSettingsProvider,
  NoProjectOpenedError,
  PathNotExistError,
} from "../../../src";
import {
  ContextInjectorMW,
  LocalSettingsLoaderMW,
  LocalSettingsWriterMW,
  ProjectSettingsLoaderMW,
} from "../../../src/core/middleware";
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
import mockLocalSettings from "./localSettings.json";

describe("Middleware - LocalSettingsLoaderMW, ContextInjectorMW: part 1", () => {
  class MyClass {
    async getQuestions(
      stage: Stage,
      inputs: Inputs,
      ctx?: CoreHookContext
    ): Promise<Result<any, FxError>> {
      assert.isTrue(ctx !== undefined && ctx.localSettings === undefined);
      return ok("");
    }
    async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
      assert.isTrue(ctx !== undefined && ctx.localSettings === undefined);
      return ok("");
    }
  }
  hooks(MyClass, {
    getQuestions: [LocalSettingsLoaderMW, ContextInjectorMW],
    other: [LocalSettingsLoaderMW, ContextInjectorMW],
  });

  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_MULTI_ENV: "true" });
  });

  afterEach(() => {
    mockedEnvRestore();
  });

  it("failed to load: NoProjectOpenedError, PathNotExistError", async () => {
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    const res = await my.other(inputs);
    assert.isTrue(res.isErr() && res.error.name === NoProjectOpenedError().name);
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    const res2 = await my.other(inputs);
    assert.isTrue(res2.isErr() && res2.error.name === PathNotExistError(inputs.projectPath).name);
  });
});

describe("Middleware - LocalSettingsLoaderMW, ContextInjectorMW: part 2", () => {
  const mockedEnvRestore = mockedEnv({ TEAMSFX_APIV2: "true", TEAMSFX_MULTI_ENV: "true" });
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectSettings = MockProjectSettings(appName);
  const inputs: Inputs = { platform: Platform.VSCode };
  inputs.projectPath = path.join(os.tmpdir(), appName);
  const confFolderPath = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
  const projectSettingsFiles = [
    path.resolve(confFolderPath, "settings.json"),
    path.resolve(confFolderPath, InputConfigsFolderName, ProjectSettingsFileName),
  ];
  const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath);
  const localSettingsFile = localSettingsProvider.localSettingsFilePath;

  beforeEach(() => {
    sandbox.stub<any, any>(fs, "readJson").callsFake(async (file: string) => {
      if (projectSettingsFiles.includes(file)) return projectSettings;
      if (file === localSettingsFile) return mockLocalSettings;
      return undefined;
    });
  });
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it(`success to load local settings -  load existing`, async () => {
    sandbox.stub<any, any>(fs, "pathExists").callsFake(async (file: string) => {
      if (projectSettingsFiles.includes(file)) return true;
      if (inputs.projectPath === file) return true;
      if (file === localSettingsFile) {
        return true;
      }
      return false;
    });
    class MyClass {
      tools = new MockTools();
      async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        assert.isTrue(ctx !== undefined);
        if (ctx) {
          if (isV2()) {
            assert.deepEqual(ctx.localSettings, mockLocalSettings);
          }
        }
        return ok("");
      }
    }
    hooks(MyClass, {
      other: [ProjectSettingsLoaderMW, LocalSettingsLoaderMW, ContextInjectorMW],
    });
    const my = new MyClass();
    const res = await my.other(inputs);
    assert.isTrue(res.isOk() && res.value === "");
  });

  it(`success to load local settings - init from zero`, async () => {
    sandbox.stub<any, any>(fs, "pathExists").callsFake(async (file: string) => {
      if (projectSettingsFiles.includes(file)) return true;
      if (inputs.projectPath === file) return true;
      if (file === localSettingsFile) return false;
      return false;
    });
    class MyClass {
      tools = new MockTools();
      async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        assert.isTrue(ctx !== undefined);
        if (ctx) {
          if (isV2()) {
            assert.deepEqual(ctx.localSettings, localSettingsProvider.initV2(true, false, false));
          }
        }
        return ok("");
      }
    }
    hooks(MyClass, {
      other: [ProjectSettingsLoaderMW, LocalSettingsLoaderMW, ContextInjectorMW],
    });
    const my = new MyClass();
    const res = await my.other(inputs);
    assert.isTrue(res.isOk() && res.value === "");
  });
});

describe("Middleware - LocalSettingsWriterMW", () => {
  const sandbox = sinon.createSandbox();
  const mockedEnvRestore = mockedEnv({ TEAMSFX_APIV2: "true", TEAMSFX_MULTI_ENV: "true" });
  afterEach(function () {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("write success", async () => {
    const appName = randomAppName();
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), appName);
    const tools = new MockTools();
    const fileMap = new Map<string, any>();
    sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, data: any) => {
      fileMap.set(file, data);
    });
    sandbox.stub(fs, "pathExists").resolves(true);
    const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath);
    const localSettingsFile = localSettingsProvider.localSettingsFilePath;
    class MyClass {
      tools = tools;
      async myMethod(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        if (ctx) ctx.localSettings = mockLocalSettings;
        return ok("");
      }
    }
    hooks(MyClass, {
      myMethod: [ContextInjectorMW, LocalSettingsWriterMW],
    });
    const my = new MyClass();
    await my.myMethod(inputs);
    const content: string = fileMap.get(localSettingsFile);
    const settingsInFile = JSON.parse(content);
    assert.deepEqual(mockLocalSettings, settingsInFile);
  });
});
