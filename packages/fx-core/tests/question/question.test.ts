// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs, InputsWithProjectPath, Platform, ok } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as path from "path";
import sinon from "sinon";
import * as fs from "fs-extra";
import os from "os";
import {
  getQuestionsForAddWebpart,
  getQuestionsForCreateAppPackage,
  getQuestionsForUpdateTeamsApp,
  getQuestionsForValidateAppPackage,
  getQuestionsForValidateManifest,
  spfxFolderQuestion,
} from "../../src/component/question";
import { randomAppName } from "../core/utils";
import {
  getQuestionForDeployAadManifest,
  validateAadManifestContainsPlaceholder,
} from "../../src/core/question";
import { QuestionNames } from "../../src/question";
import { environmentManager } from "../../src";
describe("question", () => {
  let mockedEnvRestore: RestoreFn;
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
  });
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("getQuestionsForAddWebpart", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "./test",
    };

    const res = getQuestionsForAddWebpart(inputs);

    assert.isTrue(res.isOk());
  });

  it("spfxFolderQuestion", () => {
    const projectDir = "\\test";

    const res = (spfxFolderQuestion() as any).default({ projectPath: projectDir });

    assert.equal(path.resolve(res), path.resolve("\\test/src"));
  });

  it("validate manifest question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      validateMethod: "validateAgainstSchema",
    };
    const nodeRes = await getQuestionsForValidateManifest(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("validate app package question", async () => {
    const nodeRes = await getQuestionsForValidateAppPackage();
    assert.isTrue(nodeRes.isOk());
  });

  it("create app package question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForCreateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("create app package question - cli help", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForCreateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("create app package question - vs", async () => {
    const inputs: Inputs = {
      platform: Platform.VS,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForCreateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("update Teams app question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForUpdateTeamsApp(inputs);
    assert.isTrue(nodeRes.isOk());
  });
});

describe("updateAadManifestQuestion()", async () => {
  const inputs: InputsWithProjectPath = {
    platform: Platform.VSCode,
    projectPath: path.join(os.tmpdir(), randomAppName()),
  };

  afterEach(async () => {
    sinon.restore();
  });
  it("if getQuestionForDeployAadManifest not dynamic", async () => {
    inputs.platform = Platform.CLI_HELP;
    const nodeRes = await getQuestionForDeployAadManifest(inputs);
    assert.isTrue(nodeRes.isOk() && nodeRes.value == undefined);
  });

  it("getQuestionForDeployAadManifest happy path", async () => {
    inputs.platform = Platform.VSCode;
    inputs[QuestionNames.AadAppManifestFilePath] = "aadAppManifest";
    inputs.env = "dev";
    sinon.stub(fs, "pathExistsSync").returns(true);
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    sinon.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
    const nodeRes = await getQuestionForDeployAadManifest(inputs);
    assert.isTrue(nodeRes.isOk());
    if (nodeRes.isOk()) {
      const node = nodeRes.value;
      assert.isTrue(node != undefined && node?.children?.length == 2);
      const aadAppManifestQuestion = node?.children?.[0];
      const envQuestion = node?.children?.[1];
      assert.isNotNull(aadAppManifestQuestion);
      assert.isNotNull(envQuestion);
    }
  });
  it("getQuestionForDeployAadManifest without env", async () => {
    inputs.platform = Platform.VSCode;
    inputs[QuestionNames.AadAppManifestFilePath] = "aadAppManifest";
    inputs.env = "dev";
    sinon.stub(fs, "pathExistsSync").returns(false);
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    const nodeRes = await getQuestionForDeployAadManifest(inputs);
    assert.isTrue(nodeRes.isOk());
    if (nodeRes.isOk()) {
      const node = nodeRes.value;
      assert.isTrue(node != undefined && node?.children?.length == 1);
    }
  });
  it("validateAadManifestContainsPlaceholder return undefined", async () => {
    inputs[QuestionNames.AadAppManifestFilePath] = path.join(
      __dirname,
      "..",
      "samples",
      "sampleV3",
      "aad.manifest.json"
    );
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    const res = await validateAadManifestContainsPlaceholder(inputs);
    assert.isTrue(res);
  });
  it("validateAadManifestContainsPlaceholder skip", async () => {
    inputs[QuestionNames.AadAppManifestFilePath] = "aadAppManifest";
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("test"));
    const res = await validateAadManifestContainsPlaceholder(inputs);
    assert.isFalse(res);
  });
});
