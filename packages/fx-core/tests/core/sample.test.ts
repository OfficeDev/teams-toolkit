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
import { Container } from "typedi";
import { FxCore } from "../../src";
import { CoreQuestionNames, ScratchOptionNoVSC } from "../../src/core/question";
import { SolutionPlugins, SolutionPluginsV2 } from "../../src/core/SolutionPluginContainer";
import { deleteFolder, MockSolution, MockSolutionV2, MockTools, randomAppName } from "./utils";
import * as downloadSample from "../../src/core/downloadSample";
import * as projectSettingsLoader from "../../src/core/middleware/projectSettingsLoader";
import { setTools } from "../../src/core/globalVars";
describe("Core basic APIs - create from sample", () => {
  const sandbox = sinon.createSandbox();
  const mockSolutionV1 = new MockSolution();
  const mockSolutionV2 = new MockSolutionV2();
  const tools = new MockTools();
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  beforeEach(() => {
    setTools(tools);
    Container.set(SolutionPluginsV2.AzureTeamsSolutionV2, mockSolutionV2);
    Container.set(SolutionPlugins.AzureTeamsSolution, mockSolutionV1);
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
  });

  it("create from sample hello-world-tab", async () => {
    appName = "hello-world-tab";
    projectPath = path.resolve(os.tmpdir(), appName);
    deleteFolder(projectPath);
    const inputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC.id,
      [CoreQuestionNames.Samples]: "hello-world-tab",
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
    appName = "hello-world-tab";
    projectPath = path.resolve(os.tmpdir(), appName);
    deleteFolder(projectPath);
    const inputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNoVSC.id,
      [CoreQuestionNames.Samples]: "hello-world-tab",
      stage: Stage.create,
    };
    const res = await downloadSample.downloadSample(inputs);
    assert.isTrue(res.isOk() && res.value === projectPath);
  });
});
