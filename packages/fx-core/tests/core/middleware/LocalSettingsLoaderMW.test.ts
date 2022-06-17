// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, NextFunction } from "@feathersjs/hooks/lib";
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
  createV2Context,
  LocalSettingsProvider,
  NoProjectOpenedError,
  PathNotExistError,
  setTools,
} from "../../../src";
import * as tools from "../../../src/common/tools";
import {
  ContextInjectorMW,
  LocalSettingsLoaderMW,
  LocalSettingsWriterMW,
  newSolutionContext,
  ProjectSettingsLoaderMW,
} from "../../../src/core/middleware";
import { CoreHookContext } from "../../../src/core/types";
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
import mockLocalSettings from "./localSettings.json";

describe("Middleware - LocalSettingsLoaderMW, ContextInjectorMW: part 1", () => {
  const sandbox = sinon.createSandbox();
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
    mockedEnvRestore = mockedEnv({ __TEAMSFX_INSIDER_PREVIEW: "true" });
    sandbox.stub(tools, "isConfigUnifyEnabled").returns(false);
  });

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
  });

  it("failed to load: NoProjectOpenedError, PathNotExistError", async () => {
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    const res = await my.other(inputs);
    assert.isTrue(res.isErr() && res.error instanceof NoProjectOpenedError);
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    const res2 = await my.other(inputs);
    assert.isTrue(res2.isErr() && res2.error instanceof PathNotExistError);
  });
});

describe("Middleware - LocalSettingsLoaderMW, ContextInjectorMW: part 2", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(tools, "isConfigUnifyEnabled").returns(false);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it(`success to load local settings -  load existing`, async () => {
    const appName = randomAppName();
    const projectPath = path.join(os.tmpdir(), appName);
    const projectSettings = MockProjectSettings(appName);
    const inputs: Inputs = { platform: Platform.VSCode, projectPath: projectPath };
    const confFolderPath = path.resolve(projectPath, `.${ConfigFolderName}`);
    const projectSettingsFiles = [
      path.resolve(confFolderPath, "settings.json"),
      path.resolve(confFolderPath, InputConfigsFolderName, ProjectSettingsFileName),
    ];
    const localSettingsProvider = new LocalSettingsProvider(projectPath);
    const localSettingsFile = localSettingsProvider.localSettingsFilePath;
    sandbox.stub<any, any>(fs, "readJson").callsFake(async (file: string) => {
      if (projectSettingsFiles.includes(file)) return projectSettings;
      if (file === localSettingsFile) return mockLocalSettings;
      return undefined;
    });
    sandbox.stub<any, any>(fs, "pathExists").callsFake(async (file: string) => {
      if (projectSettingsFiles.includes(file)) return true;
      if (inputs.projectPath === file) return true;
      if (file === localSettingsFile) {
        return true;
      }
      return false;
    });
    const tools = new MockTools();
    setTools(tools);
    class MyClass {
      tools = tools;
      async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        assert.isTrue(ctx !== undefined);
        if (ctx) {
          assert.deepEqual(ctx.localSettings, mockLocalSettings);
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
    const appName = randomAppName();
    const projectPath = path.join(os.tmpdir(), appName);
    const projectSettings = MockProjectSettings(appName);
    const inputs: Inputs = { platform: Platform.VSCode, projectPath: projectPath };
    const confFolderPath = path.resolve(projectPath, `.${ConfigFolderName}`);
    const projectSettingsFiles = [
      path.resolve(confFolderPath, "settings.json"),
      path.resolve(confFolderPath, InputConfigsFolderName, ProjectSettingsFileName),
    ];
    const MockContextLoaderMW = async (ctx: CoreHookContext, next: NextFunction) => {
      ctx.contextV2 = createV2Context(projectSettings);
      ctx.solutionContext = await newSolutionContext(tools, inputs);
      await next();
    };
    const localSettingsProvider = new LocalSettingsProvider(projectPath);
    const localSettingsFile = localSettingsProvider.localSettingsFilePath;
    sandbox.stub<any, any>(fs, "readJson").callsFake(async (file: string) => {
      if (projectSettingsFiles.includes(file)) return projectSettings;
      if (file === localSettingsFile) return mockLocalSettings;
      return undefined;
    });
    sandbox.stub<any, any>(fs, "pathExists").callsFake(async (file: string) => {
      if (projectSettingsFiles.includes(file)) return true;
      if (inputs.projectPath === file) return true;
      if (file === localSettingsFile) return false;
      return false;
    });
    const tools = new MockTools();
    setTools(tools);
    class MyClass {
      tools = tools;
      async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        assert.isTrue(ctx !== undefined);
        if (ctx) {
          assert.deepEqual(
            ctx.localSettings,
            localSettingsProvider.initV2(true, false, false, true)
          );
        }
        assert.isTrue(ctx?.solutionContext !== undefined);
        assert.isTrue(ctx?.solutionContext?.localSettings !== undefined);
        if (ctx && ctx.solutionContext?.localSettings) {
          assert.deepEqual(
            localSettingsProvider.convertToLocalSettingsJson(ctx.solutionContext.localSettings),
            ctx.localSettings
          );
        }
        return ok("");
      }
    }
    hooks(MyClass, {
      other: [
        ProjectSettingsLoaderMW,
        MockContextLoaderMW,
        LocalSettingsLoaderMW,
        ContextInjectorMW,
      ],
    });
    const my = new MyClass();
    const res = await my.other(inputs);
    assert.isTrue(res.isOk() && res.value === "");
  });
});

describe("Middleware - LocalSettingsWriterMW", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(function () {
    sandbox.stub(tools, "isConfigUnifyEnabled").returns(false);
  });
  afterEach(function () {
    sandbox.restore();
  });

  it("write success", async () => {
    const appName = randomAppName();
    const projectPath = path.join(os.tmpdir(), appName);
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = projectPath;
    const tools = new MockTools();
    setTools(tools);
    const fileMap = new Map<string, any>();
    sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, data: any) => {
      fileMap.set(file, data);
    });
    sandbox.stub(fs, "pathExists").resolves(true);
    const localSettingsProvider = new LocalSettingsProvider(projectPath);
    const localSettingsFile = localSettingsProvider.localSettingsFilePath;
    class MyClass {
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
