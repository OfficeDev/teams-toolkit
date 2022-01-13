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
import sinon from "sinon";
import * as os from "os";
import * as path from "path";
import fs from "fs-extra";
import "mocha";
import { NoProjectOpenedError, PathNotExistError } from "../../../src";
import { ContextInjectorMW, ProjectSettingsLoaderMW } from "../../../src/core/middleware";
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
import { CoreHookContext } from "../../../src/core/middleware/CoreHookContext";
import { setTools } from "../../../src/core/globalVars";

describe("Middleware - ProjectSettingsLoaderMW, ContextInjectorMW: part 1", () => {
  class MyClass {
    async getQuestions(
      stage: Stage,
      inputs: Inputs,
      ctx?: CoreHookContext
    ): Promise<Result<any, FxError>> {
      assert.isTrue(ctx !== undefined && ctx.projectSettings === undefined);
      return ok("");
    }
    async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
      assert.isTrue(ctx !== undefined && ctx.projectSettings === undefined);
      return ok("");
    }
  }
  hooks(MyClass, {
    getQuestions: [ProjectSettingsLoaderMW, ContextInjectorMW],
    other: [ProjectSettingsLoaderMW, ContextInjectorMW],
  });

  it("ignore loading project settings", async () => {
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    await my.getQuestions(Stage.create, inputs);
    inputs.platform = Platform.CLI_HELP;
    await my.other(inputs);
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

describe("Middleware - ProjectSettingsLoaderMW, ContextInjectorMW: part 2", () => {
  const sandbox = sinon.createSandbox();
  const appName = randomAppName();
  const projectSettings = MockProjectSettings(appName);
  const inputs: Inputs = { platform: Platform.VSCode };
  inputs.projectPath = path.join(os.tmpdir(), appName);
  const confFolderPath = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
  const settingsFiles = [
    path.resolve(confFolderPath, "settings.json"),
    path.resolve(confFolderPath, InputConfigsFolderName, ProjectSettingsFileName),
  ];

  beforeEach(() => {
    sandbox.stub<any, any>(fs, "readJson").callsFake(async (file: string) => {
      if (settingsFiles.includes(file)) return projectSettings;
      return undefined;
    });
    sandbox.stub<any, any>(fs, "pathExists").callsFake(async (file: string) => {
      if (settingsFiles.includes(file)) return true;
      if (inputs.projectPath === file) return true;
      return false;
    });
  });

  afterEach(() => {
    sandbox.restore();
  });
  const tools = new MockTools();
  setTools(tools);
  class MyClass {
    tools = tools;
    async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
      assert.isTrue(ctx !== undefined);
      if (ctx) {
        assert.deepEqual(projectSettings, ctx.projectSettings);
        assert.isTrue(ctx.contextV2 !== undefined);
      }
      return ok("");
    }
  }
  hooks(MyClass, {
    other: [ProjectSettingsLoaderMW, ContextInjectorMW],
  });
  it(`success to load project settings`, async () => {
    const my = new MyClass();
    const res = await my.other(inputs);
    assert.isTrue(res.isOk() && res.value === "");
  });
});
