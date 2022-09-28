// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import * as os from "os";
import * as path from "path";
import fs from "fs-extra";
import { newEnvInfoV3 } from "../../../src/core/environment";
import { ComponentNames } from "../../../src/component/constants";
import { createContextV3, newProjectSettingsV3 } from "../../../src/component/utils";
import { BotCodeProvider } from "../../../src/component/code/botCode";
import * as templateActions from "../../../src/common/template-utils/templatesActions";
import { MockTools, randomAppName } from "../../core/utils";
import { InputsWithProjectPath, Platform, ResourceContextV3 } from "@microsoft/teamsfx-api";
import * as templateUtils from "../../../src/common/template-utils/templatesUtils";
import { TemplateProjectsScenarios } from "../../../src/component/feature/bot/constants";
import { TemplateZipFallbackError, UnzipError } from "../../../src/component/code/error";
import { setTools } from "../../../src/core/globalVars";

describe("Bot code generate", () => {
  const tools = new MockTools();
  setTools(tools);
  const sandbox = sinon.createSandbox();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const projectSettings = newProjectSettingsV3();
  const context = createContextV3(projectSettings);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    language: "typescript",
    "app-name": appName,
    scenarios: [TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME],
  };

  beforeEach(() => {
    sandbox.stub(templateActions.fetchTemplatesUrlWithTagAction, "run").rejects();
    sandbox.stub(templateActions.fetchTemplatesZipFromUrlAction, "run").rejects();
  });
  afterEach(() => {
    sandbox.restore();
  });
  it("scaffold fallback", async () => {
    sandbox.stub(fs, "readFile").resolves("" as any);
    sandbox.stub(templateUtils, "unzip").resolves();

    const botCode = new BotCodeProvider();
    const res = await botCode.generate(context, inputs);

    assert.isTrue(res.isOk());
  });
  it("scaffold fallback error", async () => {
    const errorMessage = "read file error";
    sandbox.stub(fs, "readFile").rejects(errorMessage);
    sandbox.stub(templateUtils, "unzip").resolves();

    const botCode = new BotCodeProvider();
    const res = await botCode.generate(context, inputs);

    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, new TemplateZipFallbackError("").name);
    }
  });
  it("scaffold unzip error", async () => {
    const errorMessage = "unzip error";
    sandbox.stub(fs, "readFile").resolves();
    sandbox.stub(templateUtils, "unzip").rejects(errorMessage);

    const botCode = new BotCodeProvider();
    const res = await botCode.generate(context, inputs);

    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, new UnzipError("").name);
    }
  });

  it("configure vsc", async () => {
    const botCode = new BotCodeProvider();
    const res = await botCode.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });

  it("configure vs happy path", async () => {
    projectSettings.programmingLanguage = "csharp";
    projectSettings.components = [{ name: ComponentNames.TeamsBot, folder: "bot" }];
    sandbox.stub(fs, "readFile").resolves("" as any);
    sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "pathExists").resolves(true);
    const envInfo = newEnvInfoV3("local");
    context.envInfo = envInfo;

    const botCode = new BotCodeProvider();
    const res = await botCode.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });

  it("configure vs folder not exist", async () => {
    projectSettings.programmingLanguage = "csharp";
    projectSettings.components = [{ name: ComponentNames.TeamsBot }];
    const envInfo = newEnvInfoV3("local");
    context.envInfo = envInfo;

    const botCode = new BotCodeProvider();
    const res = await botCode.configure(context as ResourceContextV3, inputs);
    assert.isTrue(res.isOk());
  });
});
