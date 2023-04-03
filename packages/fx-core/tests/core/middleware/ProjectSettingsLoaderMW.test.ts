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
  ProjectSettings,
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
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
import { CoreHookContext } from "../../../src/core/types";
import { ProjectSettingsLoaderMW } from "../../../src/core/middleware/projectSettingsLoader";
import { ContextInjectorMW } from "../../../src/core/middleware/contextInjector";
import { NoProjectOpenedError } from "../../../src/core/error";
import { setTools } from "../../../src/core/globalVars";
import mockedEnv, { RestoreFn } from "mocked-env";
import { FileNotFoundError } from "../../../src/error/common";

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

  it("failed to load: NoProjectOpenedError, FileNotFoundError", async () => {
    const my = new MyClass();
    const inputs: Inputs = { platform: Platform.VSCode };
    const res = await my.other(inputs);
    assert.isTrue(res.isErr() && res.error instanceof NoProjectOpenedError);
    inputs.projectPath = path.join(os.tmpdir(), randomAppName());
    const res2 = await my.other(inputs);
    assert.isTrue(res2.isErr() && res2.error instanceof FileNotFoundError);
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
    path.resolve(inputs.projectPath, "teamsapp.yml"),
  ];
  let mockedEnvRestore: RestoreFn;

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
    mockedEnvRestore();
  });
  const tools = new MockTools();
  setTools(tools);
  class MyClass {
    tools = tools;
    async other(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<ProjectSettings, FxError>> {
      return ok(ctx!.projectSettings!);
    }
  }
  hooks(MyClass, {
    other: [ProjectSettingsLoaderMW, ContextInjectorMW],
  });
  it(`success to load project settings`, async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const my = new MyClass();
    const res = await my.other(inputs);
    assert.isTrue(res.isOk() && res.value !== undefined && res.value.appName === appName);
  });

  it("success load project settings from teamsapp.yml in V3", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });

    const mockedYamlFile = `
    version: 1.0.0
    projectId: 00000000-0000-0000-0000-000000000000
    `;
    sandbox.stub<any, any>(fs, "readFile").callsFake(async (file: string) => {
      if (file.includes("teamsapp.yml")) return mockedYamlFile;
      return undefined;
    });

    try {
      const my = new MyClass();
      const res = await my.other(inputs);
      assert.isTrue(res.isOk());
      const projectSettings = res._unsafeUnwrap();
      assert.equal(projectSettings.version, "1.0.0");
      assert.equal(projectSettings.projectId, "00000000-0000-0000-0000-000000000000");
    } finally {
      restore();
    }
  });

  it("success generate projectId when no projectId in teamsapp.yml in V3", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });

    const mockedYamlFile = `
    version: 1.0.0 # this is comment
    `;
    let resultFile = "";
    sandbox.stub<any, any>(fs, "readFile").callsFake(async (file: string) => {
      if (file.includes("teamsapp.yml")) return mockedYamlFile;
      return undefined;
    });
    sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, content: string) => {
      resultFile = content;
    });

    try {
      const my = new MyClass();
      const res = await my.other(inputs);
      assert.isTrue(res.isOk());
      const projectSettings = res._unsafeUnwrap();
      assert.equal(projectSettings.version, "1.0.0");
      assert.exists(projectSettings.projectId);
      assert.isTrue(resultFile.includes("projectId"));
      assert.isTrue(resultFile.includes("# this is comment"));
    } finally {
      restore();
    }
  });

  it("return error when teamsapp.yml not exists in V3", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });

    sandbox.restore();
    // mock behavior that teamsapp.yml not exists
    sandbox.stub<any, any>(fs, "pathExists").callsFake(async (file: string) => {
      if (inputs.projectPath === file) return true;
      return false;
    });

    try {
      const my = new MyClass();
      const res = await my.other(inputs);
      assert.isTrue(res.isErr());
    } finally {
      restore();
    }
  });
});
