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
  SettingsFileName,
  SettingsFolderName,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { setTools } from "../../../src/core/globalVars";
import { ContextInjectorMW } from "../../../src/core/middleware/contextInjector";
import { ProjectSettingsWriterMW } from "../../../src/core/middleware/projectSettingsWriter";
import { CoreHookContext } from "../../../src/core/types";
import { MockProjectSettings, MockSettings, MockTools, randomAppName } from "../utils";

describe("Middleware - ProjectSettingsWriterMW", () => {
  const sandbox = sinon.createSandbox();
  afterEach(function () {
    sandbox.restore();
  });
  it("ignore write", async () => {
    const spy = sandbox.spy(fs, "writeFile");
    setTools(new MockTools());
    class MyClass {
      async myMethod(inputs: Inputs): Promise<Result<any, FxError>> {
        return ok("");
      }
    }

    hooks(MyClass, {
      myMethod: [ProjectSettingsWriterMW],
    });
    const my = new MyClass();
    const inputs1: Inputs = { platform: Platform.VSCode };
    await my.myMethod(inputs1);
    const inputs2: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    await my.myMethod(inputs2);
    const inputs3: Inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
      ignoreConfigPersist: true,
    };
    await my.myMethod(inputs3);
    const inputs4: Inputs = {
      platform: Platform.VSCode,
      projectPath: path.join(os.tmpdir(), randomAppName()),
    };
    await my.myMethod(inputs4);
    assert(spy.callCount === 0);
  });

  it("write success", async () => {
    const appName = randomAppName();
    const inputs: Inputs = { platform: Platform.VSCode };
    inputs.projectPath = path.join(os.tmpdir(), appName);
    const tools = new MockTools();
    const mockProjectSettings = MockProjectSettings(appName);
    const fileMap = new Map<string, any>();
    sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, data: any) => {
      fileMap.set(file, data);
    });
    sandbox.stub(fs, "pathExists").resolves(true);
    const confFolderPath = path.resolve(inputs.projectPath, `.${ConfigFolderName}`);
    const settingsFileV1 = path.resolve(confFolderPath, "settings.json");
    const settingsFileV2 = path.resolve(
      confFolderPath,
      InputConfigsFolderName,
      ProjectSettingsFileName
    );
    class MyClass {
      async myMethod(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
        if (ctx) ctx.projectSettings = mockProjectSettings;
        return ok("");
      }
    }
    setTools(tools);
    hooks(MyClass, {
      myMethod: [ContextInjectorMW, ProjectSettingsWriterMW],
    });
    const my = new MyClass();
    await my.myMethod(inputs);
    const content: string = fileMap.get(settingsFileV2);
    const settingsInFile = JSON.parse(content);
    assert.deepEqual(mockProjectSettings, settingsInFile);
  });

  it("write success in V3", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const appName = randomAppName();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), appName);
      const tools = new MockTools();
      const settings = MockSettings();
      const fileMap = new Map<string, any>();
      sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, data: any) => {
        fileMap.set(file, data);
      });
      sandbox.stub(fs, "pathExists").resolves(true);
      const settingsFile = path.resolve(inputs.projectPath, SettingsFolderName, SettingsFileName);
      class MyClass {
        async myMethod(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          if (ctx)
            ctx.projectSettings = {
              projectId: settings.trackingId,
              version: settings.version,
            };
          return ok("");
        }
      }
      setTools(tools);
      hooks(MyClass, {
        myMethod: [ContextInjectorMW, ProjectSettingsWriterMW],
      });
      const my = new MyClass();
      await my.myMethod(inputs);
      const content: string = fileMap.get(settingsFile);
      const settingsInFile = JSON.parse(content);
      assert.deepEqual(settings, settingsInFile);
    } finally {
      restore();
    }
  });

  it("skip write when no settings.json in V3", async () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const appName = randomAppName();
      const inputs: Inputs = { platform: Platform.VSCode };
      inputs.projectPath = path.join(os.tmpdir(), appName);
      const tools = new MockTools();
      const settings = MockSettings();
      const fileMap = new Map<string, any>();
      sandbox.stub<any, any>(fs, "writeFile").callsFake(async (file: string, data: any) => {
        fileMap.set(file, data);
      });
      sandbox.stub(fs, "pathExists").resolves(false);
      const settingsFile = path.resolve(inputs.projectPath, SettingsFolderName, SettingsFileName);
      class MyClass {
        async myMethod(inputs: Inputs, ctx?: CoreHookContext): Promise<Result<any, FxError>> {
          if (ctx)
            ctx.projectSettings = {
              projectId: settings.trackingId,
              version: settings.version,
            };
          return ok("");
        }
      }
      setTools(tools);
      hooks(MyClass, {
        myMethod: [ContextInjectorMW, ProjectSettingsWriterMW],
      });
      const my = new MyClass();
      await my.myMethod(inputs);
      const content = fileMap.get(settingsFile);
      assert.notExists(content);
    } finally {
      restore();
    }
  });
});
