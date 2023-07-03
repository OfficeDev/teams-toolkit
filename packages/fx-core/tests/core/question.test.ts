import "mocha";

import chai from "chai";
import * as fs from "fs-extra";
import os from "os";
import path from "path";
import * as sinon from "sinon";

import { FuncValidation, InputsWithProjectPath, ok, Platform } from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../src/common/localizeUtils";
import { environmentManager } from "../../src/core/environment";
import {
  CoreQuestionNames,
  getQuestionForDeployAadManifest,
  validateAadManifestContainsPlaceholder,
} from "../../src/core/question";
import { appNameQuestion } from "../../src/question";
import { randomAppName } from "./utils";

describe("App name question", async () => {
  const question = appNameQuestion();
  const validFunc = (question.validation as FuncValidation<string>).validFunc;

  it("app name exceed maxlength of 30", async () => {
    const input = "SurveyMonkeyWebhookNotification";
    const result = await validFunc(input);

    chai.assert.equal(result, getLocalizedString("core.QuestionAppName.validation.maxlength"));
  });

  it("app name with only letters", async () => {
    const input = "app";
    const result = await validFunc(input);

    chai.assert.isUndefined(result);
  });

  it("app name starting with digit", async () => {
    const input = "123app";
    const result = await validFunc(input);

    chai.assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
  });

  it("app name count of alphanumerics less than 2", async () => {
    const input = "a..(";
    const result = await validFunc(input);

    chai.assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
  });

  it("app name containing dot", async () => {
    const input = "app.123";
    const result = await validFunc(input);

    chai.assert.isUndefined(result);
  });

  it("app name containing hyphen", async () => {
    const input = "app-123";
    const result = await validFunc(input);

    chai.assert.isUndefined(result);
  });

  it("app name containing multiple special characters", async () => {
    const input = "a..(1";
    const result = await validFunc(input);

    chai.assert.isUndefined(result);
  });

  it("app name containing space", async () => {
    const input = "app 123";
    const result = await validFunc(input);

    chai.assert.isUndefined(result);
  });

  it("app name containing dot at the end - wrong pattern", async () => {
    const input = "app.app.";
    const result = await validFunc(input);

    chai.assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
  });

  it("app name containing space at the end - wrong pattern", async () => {
    const input = "app123 ";
    const result = await validFunc(input);

    chai.assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
  });

  it("app name containing invalid control code", async () => {
    const input = "a\u0001a";
    const result = await validFunc(input);

    chai.assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
  });

  it("app name containing invalid character", async () => {
    const input = "app<>123";
    const result = await validFunc(input);

    chai.assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
  });

  it("invalid app name containing &", async () => {
    const input = "app&123";
    const result = await validFunc(input);

    chai.assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
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
    chai.assert.isTrue(nodeRes.isOk() && nodeRes.value == undefined);
  });

  it("getQuestionForDeployAadManifest happy path", async () => {
    inputs.platform = Platform.VSCode;
    inputs[CoreQuestionNames.AadAppManifestFilePath] = "aadAppManifest";
    inputs.env = "dev";
    sinon.stub(fs, "pathExistsSync").returns(true);
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    sinon.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
    const nodeRes = await getQuestionForDeployAadManifest(inputs);
    chai.assert.isTrue(nodeRes.isOk());
    if (nodeRes.isOk()) {
      const node = nodeRes.value;
      chai.assert.isTrue(node != undefined && node?.children?.length == 2);
      const aadAppManifestQuestion = node?.children?.[0];
      const envQuestion = node?.children?.[1];
      chai.assert.isNotNull(aadAppManifestQuestion);
      chai.assert.isNotNull(envQuestion);
    }
  });
  it("getQuestionForDeployAadManifest without env", async () => {
    inputs.platform = Platform.VSCode;
    inputs[CoreQuestionNames.AadAppManifestFilePath] = "aadAppManifest";
    inputs.env = "dev";
    sinon.stub(fs, "pathExistsSync").returns(false);
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    const nodeRes = await getQuestionForDeployAadManifest(inputs);
    chai.assert.isTrue(nodeRes.isOk());
    if (nodeRes.isOk()) {
      const node = nodeRes.value;
      chai.assert.isTrue(node != undefined && node?.children?.length == 1);
    }
  });
  it("validateAadManifestContainsPlaceholder return undefined", async () => {
    inputs[CoreQuestionNames.AadAppManifestFilePath] = path.join(
      __dirname,
      "..",
      "samples",
      "sampleV3",
      "aad.manifest.json"
    );
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    const res = await validateAadManifestContainsPlaceholder(inputs);
    chai.assert.isTrue(res);
  });
  it("validateAadManifestContainsPlaceholder skip", async () => {
    inputs[CoreQuestionNames.AadAppManifestFilePath] = "aadAppManifest";
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("test"));
    const res = await validateAadManifestContainsPlaceholder(inputs);
    chai.expect(res).to.equal(false);
  });
});
