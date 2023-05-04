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
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { MetadataV3 } from "../../../src/common/versionMetadata";
import { setTools } from "../../../src/core/globalVars";
import { ContextInjectorMW } from "../../../src/core/middleware/contextInjector";
import { ProjectSettingsWriterMW } from "../../../src/core/middleware/projectSettingsWriter";
import { CoreHookContext } from "../../../src/core/types";
import { MockProjectSettings, MockTools, randomAppName } from "../utils";
import mockedEnv, { RestoreFn } from "mocked-env";
describe("Middleware - ProjectSettingsWriterMW", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({});
  });
  afterEach(function () {
    sandbox.restore();
    mockedEnvRestore();
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
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
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
});
