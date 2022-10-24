// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, Platform, Stage, Ok, Err, FxError, UserError } from "@microsoft/teamsfx-api";
import { assert, expect } from "chai";
import fs from "fs-extra";
import "mocha";
import { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { FxCore } from "../../src";
import * as featureFlags from "../../src/common/featureFlags";
import { validateProjectSettings } from "../../src/common/projectSettingsHelper";
import { environmentManager } from "../../src/core/environment";
import { setTools } from "../../src/core/globalVars";
import { loadProjectSettings } from "../../src/core/middleware/projectSettingsLoader";
import {
  CoreQuestionNames,
  ProgrammingLanguageQuestion,
  ScratchOptionYesVSC,
} from "../../src/core/question";
import {
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
  TabSPFxItem,
} from "../../src/component/constants";
import { deleteFolder, MockTools, randomAppName } from "./utils";
import * as templateActions from "../../src/common/template-utils/templatesActions";
import mockedEnv from "mocked-env";
import { UpdateAadAppDriver } from "../../src/component/driver/aad/update";
import AdmZip from "adm-zip";
import { NoAadManifestExistError } from "../../src/core/error";
import "../../src/component/driver/aad/update";
import { isError } from "lodash";

let mockedEnvRestore: () => void;
describe("Core basic APIs", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  beforeEach(() => {
    setTools(tools);
    sandbox.stub<any, any>(featureFlags, "isPreviewFeaturesEnabled").returns(true);
    sandbox.stub<any, any>(templateActions, "scaffoldFromTemplates").resolves();
  });
  afterEach(async () => {
    sandbox.restore();
    deleteFolder(projectPath);
  });
  describe("create from new", async () => {
    it("CLI with folder input", async () => {
      appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.CLI,
        [CoreQuestionNames.Folder]: os.tmpdir(),
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = path.resolve(os.tmpdir(), appName);
      assert.isTrue(res.isOk() && res.value === projectPath);
    });

    it("VSCode without customized default root directory", async () => {
      appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: ["Tab"],
        [CoreQuestionNames.Folder]: os.tmpdir(),
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = inputs.projectPath!;
      assert.isTrue(res.isOk() && res.value === projectPath);
      const projectSettingsResult = await loadProjectSettings(inputs, true);
      assert.isTrue(projectSettingsResult.isOk());
      if (projectSettingsResult.isOk()) {
        const projectSettings = projectSettingsResult.value;
        const validSettingsResult = validateProjectSettings(projectSettings);
        assert.isTrue(validSettingsResult === undefined);
        assert.isTrue(projectSettings.version === "2.1.0");
      }
    });

    it("VSCode without customized default root directory - new UI", async () => {
      appName = randomAppName();
      const core = new FxCore(tools);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.AppName]: appName,
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
        [CoreQuestionNames.ProgrammingLanguage]: "javascript",
        [CoreQuestionNames.Capabilities]: "Tab",
        [CoreQuestionNames.Folder]: os.tmpdir(),
        stage: Stage.create,
      };
      const res = await core.createProject(inputs);
      projectPath = inputs.projectPath!;
      assert.isTrue(res.isOk() && res.value === projectPath);
      const projectSettingsResult = await loadProjectSettings(inputs, true);
      assert.isTrue(projectSettingsResult.isOk());
      if (projectSettingsResult.isOk()) {
        const projectSettings = projectSettingsResult.value;
        const validSettingsResult = validateProjectSettings(projectSettings);
        assert.isTrue(validSettingsResult === undefined);
        assert.isTrue(projectSettings.version === "2.1.0");
      }
    });
  });

  it("scaffold and createEnv, activateEnv", async () => {
    appName = randomAppName();
    const core = new FxCore(tools);
    const inputs: Inputs = {
      platform: Platform.CLI,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.Capabilities]: "Tab",
      stage: Stage.create,
    };
    const createRes = await core.createProject(inputs);
    assert.isTrue(createRes.isOk());
    projectPath = inputs.projectPath!;
    await fs.writeFile(
      path.resolve(projectPath, "templates", "appPackage", "manifest.template.json"),
      "{}"
    );
    const newEnvName = "newEnv";
    const envListResult = await environmentManager.listRemoteEnvConfigs(projectPath);
    if (envListResult.isErr()) {
      assert.fail("failed to list env names");
    }
    assert.isTrue(envListResult.value.length === 1);
    assert.isTrue(envListResult.value[0] === environmentManager.getDefaultEnvName());
    inputs[CoreQuestionNames.NewTargetEnvName] = newEnvName;
    const createEnvRes = await core.createEnv(inputs);
    assert.isTrue(createEnvRes.isOk());

    const newEnvListResult = await environmentManager.listRemoteEnvConfigs(projectPath);
    if (newEnvListResult.isErr()) {
      assert.fail("failed to list env names");
    }
    assert.isTrue(newEnvListResult.value.length === 2);
    assert.isTrue(newEnvListResult.value[0] === environmentManager.getDefaultEnvName());
    assert.isTrue(newEnvListResult.value[1] === newEnvName);

    inputs.env = "newEnv";
    const activateEnvRes = await core.activateEnv(inputs);
    assert.isTrue(activateEnvRes.isOk());
  });

  it("deploy aad manifest happy path", async () => {
    const core = new FxCore(tools);
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    const appName = mockV3Project();
    sandbox.stub(UpdateAadAppDriver.prototype, "run").resolves(new Ok(new Map()));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
      [CoreQuestionNames.Folder]: os.tmpdir(),
      stage: Stage.deployAad,
      projectPath: path.join(os.tmpdir(), appName, "samples-v3"),
    };
    const res = await core.deployAadManifest(inputs);
    assert.isTrue(await fs.pathExists(path.join(os.tmpdir(), appName, "samples-v3", "build")));
    await deleteTestProject(appName);
    assert.isTrue(res.isOk());
    mockedEnvRestore();
  });

  it("deploy aad manifest return err", async () => {
    const core = new FxCore(tools);
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    const appName = mockV3Project();
    const appManifestPath = path.join(
      os.tmpdir(),
      appName,
      "samples-v3",
      ".fx",
      "aad.template.json"
    );
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
      [CoreQuestionNames.Folder]: os.tmpdir(),
      stage: Stage.deployAad,
      projectPath: path.join(os.tmpdir(), appName, "samples-v3"),
    };
    sandbox
      .stub(UpdateAadAppDriver.prototype, "run")
      .throws(new UserError("error name", "fake_error", "fake_err_msg"));
    const errMsg = `AAD manifest doesn't exist in ${appManifestPath}, please use the CLI to specify an AAD manifest to deploy.`;
    const res = await core.deployAadManifest(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.strictEqual(res.error.message, "fake_err_msg");
    }
  });

  it("deploy aad manifest not exist", async () => {
    const core = new FxCore(tools);
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    const appName = mockV3Project();
    const appManifestPath = path.join(
      os.tmpdir(),
      appName,
      "samples-v3",
      ".fx",
      "aad.template.json"
    );
    await fs.remove(appManifestPath);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.Capabilities]: ["Tab", "TabSSO"],
      [CoreQuestionNames.Folder]: os.tmpdir(),
      stage: Stage.deployAad,
      projectPath: path.join(os.tmpdir(), appName, "samples-v3"),
    };
    const errMsg = `AAD manifest doesn't exist in ${appManifestPath}, please use the CLI to specify an AAD manifest to deploy.`;
    const res = await core.deployAadManifest(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof NoAadManifestExistError);
      assert.equal(res.error.message, errMsg);
    }
    await deleteTestProject(appName);
    mockedEnvRestore();
  });

  it("ProgrammingLanguageQuestion", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: TabSPFxItem.id,
    };
    if (
      ProgrammingLanguageQuestion.dynamicOptions &&
      ProgrammingLanguageQuestion.placeholder &&
      typeof ProgrammingLanguageQuestion.placeholder === "function"
    ) {
      const options = ProgrammingLanguageQuestion.dynamicOptions(inputs);
      assert.deepEqual([{ id: "typescript", label: "TypeScript" }], options);
      const placeholder = ProgrammingLanguageQuestion.placeholder(inputs);
      assert.equal("SPFx is currently supporting TypeScript only.", placeholder);
    }

    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: TabOptionItem.id,
    });
    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: BotOptionItem.id,
    });
    languageAssert({
      platform: Platform.VSCode,
      [CoreQuestionNames.Capabilities]: MessageExtensionItem.id,
    });

    function languageAssert(inputs: Inputs) {
      if (
        ProgrammingLanguageQuestion.dynamicOptions &&
        ProgrammingLanguageQuestion.placeholder &&
        typeof ProgrammingLanguageQuestion.placeholder === "function"
      ) {
        const options = ProgrammingLanguageQuestion.dynamicOptions(inputs);
        assert.deepEqual(
          [
            { id: "javascript", label: "JavaScript" },
            { id: "typescript", label: "TypeScript" },
          ],
          options
        );
        const placeholder = ProgrammingLanguageQuestion.placeholder(inputs);
        assert.equal("Select a programming language.", placeholder);
      }
    }
  });
});

function mockV3Project(): string {
  const zip = new AdmZip(path.join(__dirname, "./samples_v3.zip"));
  const appName = randomAppName();
  zip.extractAllTo(path.join(os.tmpdir(), appName));
  return appName;
}

async function deleteTestProject(appName: string) {
  await fs.remove(path.join(os.tmpdir(), appName));
}
