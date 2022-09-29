// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import * as os from "os";
import * as path from "path";
import fs from "fs-extra";
import { createContextV3, newProjectSettingsV3 } from "../../../src/component/utils";
import * as templateActions from "../../../src/common/template-utils/templatesActions";
import { MockTools, randomAppName } from "../../core/utils";
import { InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import * as templateUtils from "../../../src/common/template-utils/templatesUtils";
import { TemplateZipFallbackError, UnzipError } from "../../../src/component/code/error";
import { setTools } from "../../../src/core/globalVars";
import { ApiCodeProvider } from "../../../src/component/code/api/apiCode";
import { CoreQuestionNames } from "../../../src/core/question";

describe("Api code generate", () => {
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
    [CoreQuestionNames.ProgrammingLanguage]: "typescript",
    "app-name": appName,
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

    const apiCode = new ApiCodeProvider();
    const res = await apiCode.generate(context, inputs);

    assert.isTrue(res.isOk());
  });
  it("scaffold fallback error", async () => {
    const errorMessage = "read file error";
    sandbox.stub(fs, "readFile").rejects(errorMessage);
    sandbox.stub(templateUtils, "unzip").resolves();

    const apiCode = new ApiCodeProvider();
    const res = await apiCode.generate(context, inputs);

    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, new TemplateZipFallbackError("").name);
    }
  });
  it("scaffold unzip error", async () => {
    const errorMessage = "unzip error";
    sandbox.stub(fs, "readFile").resolves();
    sandbox.stub(templateUtils, "unzip").rejects(errorMessage);

    const apiCode = new ApiCodeProvider();
    const res = await apiCode.generate(context, inputs);

    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, new UnzipError("").name);
    }
  });
});
