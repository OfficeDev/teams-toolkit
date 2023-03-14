// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ok, Platform, ProjectSettings, Stage } from "@microsoft/teamsfx-api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { FxCore } from "../../src/core/FxCore";
import * as downloadSample from "../../src/core/downloadSample";
import { setTools } from "../../src/core/globalVars";
import * as projectSettingsLoader from "../../src/core/middleware/projectSettingsLoader";
import { CoreQuestionNames, ScratchOptionNoVSC } from "../../src/core/question";
import { deleteFolder, MockTools, randomAppName } from "./utils";
import mockedEnv, { RestoreFn } from "mocked-env";
describe("Core basic APIs - create from sample", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    setTools(tools);
    sandbox
      .stub<any, any>(axios, "get")
      .callsFake(async (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<any>> => {
        const buffer = fs.readFileSync("./tests/core/samples_v2.zip");
        return {
          data: buffer,
          status: 200,
          statusText: "",
          headers: {},
          config: config!,
          request: {},
        };
      });
  });
  afterEach(async () => {
    sandbox.restore();
    deleteFolder(projectPath);
    mockedEnvRestore();
  });

  it("create from sample todo-list-SPFx", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    appName = "todo-list-SPFx";
    projectPath = path.resolve(os.tmpdir(), appName);
    deleteFolder(projectPath);
    const inputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC().id,
      [CoreQuestionNames.Samples]: "todo-list-SPFx",
      stage: Stage.create,
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk() && res.value === projectPath);
    const projectSettings = await fs.readJson(
      projectSettingsLoader.getProjectSettingsPath(projectPath)
    );
    assert.isTrue(projectSettings.projectId !== undefined);
  });

  it("downloadSample", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: "123123",
    };
    sandbox.stub(downloadSample, "downloadSampleHook").resolves();
    sandbox.stub(downloadSample, "saveFilesRecursively").resolves();
    sandbox.stub(projectSettingsLoader, "loadProjectSettings").resolves(ok(projectSettings));
    appName = "todo-list-SPFx";
    projectPath = path.resolve(os.tmpdir(), appName);
    deleteFolder(projectPath);
    const inputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC().id,
      [CoreQuestionNames.Samples]: "todo-list-SPFx",
      stage: Stage.create,
    };
    const res = await downloadSample.downloadSample(inputs);
    assert.isTrue(res.isOk() && res.value === projectPath);
  });
});
