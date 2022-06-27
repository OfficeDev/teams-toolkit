// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { InputsWithProjectPath, ok, Platform, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import * as templatesAction from "../../../src/common/template-utils/templatesActions";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import fs from "fs-extra";
import { createSandbox } from "sinon";
import { createContextV3 } from "../../../src/component/utils";
import { runAction } from "../../../src/component/workflow";
import { setTools } from "../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../core/utils";
describe("Bot Feature", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const context = createContextV3();
  const projectSetting: ProjectSettingsV3 = {
    appName: "",
    projectId: "",
    programmingLanguage: "typescript",
    components: [],
  };
  beforeEach(() => {
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
    sandbox.stub(templatesAction, "scaffoldFromTemplates");
    sandbox.stub(fs, "readJson").resolves(projectSetting);
    sandbox.stub(fs, "writeJson").resolves();
    sandbox.stub(fs, "pathExists").resolves();
    sandbox.stub(fs, "copyFile").resolves();
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "appendFile").resolves();
    sandbox.stub(fs, "writeFile").resolves();
    sandbox.stub(fs, "appendFileSync").resolves();
    sandbox.stub(fs, "writeFileSync").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("add", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      feature: "Bot",
      language: "typescript",
      "app-name": appName,
    };
    const addBotRes = await runAction("teams-bot.add", context, inputs);
    if (addBotRes.isErr()) {
      console.log(addBotRes.error);
    }
    assert.isTrue(addBotRes.isOk());
  });
});
