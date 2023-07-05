// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Inputs,
  Platform,
  Question,
  UserError,
  UserInteraction,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as path from "path";
import sinon from "sinon";
import { CollaborationConstants, QuestionTreeVisitor, envUtil, traverse } from "../../src";
import { CollaborationUtil } from "../../src/core/collaborator";
import { QuestionNames, SPFxImportFolderQuestion } from "../../src/question";
import {
  envQuestionCondition,
  getQuestionsForAddWebpart,
  getQuestionsForSelectTeamsAppManifest,
  getQuestionsForValidateAppPackage,
  isAadMainifestContainsPlaceholder,
  selectAadAppManifestQuestionNode,
} from "../../src/question/other";
import { MockUserInteraction } from "../core/utils";
import { callFuncs } from "./create.test";

const ui = new MockUserInteraction();

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

    const res = getQuestionsForAddWebpart();

    assert.isTrue(res.isOk());
  });

  it("SPFxImportFolderQuestion", () => {
    const projectDir = "\\test";

    const res = (SPFxImportFolderQuestion(true) as any).default({ projectPath: projectDir });

    assert.equal(path.resolve(res), path.resolve("\\test/src"));
  });

  it("validate manifest question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      validateMethod: "validateAgainstSchema",
    };
    const nodeRes = await getQuestionsForSelectTeamsAppManifest();
    assert.isTrue(nodeRes.isOk());
  });

  it("validate app package question", async () => {
    const nodeRes = await getQuestionsForValidateAppPackage();
    assert.isTrue(nodeRes.isOk());
  });
});

describe("selectAadAppManifestQuestionNode()", async () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  it("traverse without projectPath", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
    };
    const questions: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questions.push(question.name);
      return ok({ type: "success", result: undefined });
    };
    await traverse(selectAadAppManifestQuestionNode(), inputs, ui, undefined, visitor);
    assert.deepEqual(questions, []);
  });

  it("happy path", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    sandbox.stub(fs, "pathExistsSync").returns(true);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "local"]));
    const questions: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questions.push(question.name);
      await callFuncs(question, inputs);
      if (question.name === QuestionNames.AadAppManifestFilePath) {
        return ok({ type: "success", result: "aadAppManifest" });
      } else if (question.name === QuestionNames.Env) {
        return ok({ type: "success", result: "dev" });
      } else if (question.name === QuestionNames.ConfirmManifest) {
        return ok({ type: "success", result: "manifest" });
      }
      return ok({ type: "success", result: undefined });
    };
    await traverse(selectAadAppManifestQuestionNode(), inputs, ui, undefined, visitor);
    console.log(questions);
    assert.deepEqual(questions, [
      QuestionNames.AadAppManifestFilePath,
      QuestionNames.ConfirmManifest,
    ]);
  });
  it("without env", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    sandbox.stub(fs, "pathExistsSync").returns(true);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    sandbox.stub(envUtil, "listEnv").resolves(err(new UserError({})));
    const questions: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questions.push(question.name);
      await callFuncs(question, inputs);
      if (question.name === QuestionNames.AadAppManifestFilePath) {
        return ok({ type: "success", result: "aadAppManifest" });
      } else if (question.name === QuestionNames.Env) {
        return ok({ type: "success", result: "dev" });
      } else if (question.name === QuestionNames.ConfirmManifest) {
        return ok({ type: "success", result: "manifest" });
      }
      return ok({ type: "success", result: undefined });
    };
    await traverse(selectAadAppManifestQuestionNode(), inputs, ui, undefined, visitor);
    console.log(questions);
    assert.deepEqual(questions, [
      QuestionNames.AadAppManifestFilePath,
      QuestionNames.ConfirmManifest,
    ]);
  });
  it("isAadMainifestContainsPlaceholder return undefined", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    inputs[QuestionNames.AadAppManifestFilePath] = path.join(
      __dirname,
      "..",
      "samples",
      "sampleV3",
      "aad.manifest.json"
    );
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(Buffer.from("${{fake_placeHolder}}"));
    const res = await isAadMainifestContainsPlaceholder(inputs);
    assert.isTrue(res);
  });
  it("isAadMainifestContainsPlaceholder skip", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    inputs[QuestionNames.AadAppManifestFilePath] = "aadAppManifest";
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(Buffer.from("test"));
    const res = await isAadMainifestContainsPlaceholder(inputs);
    assert.isFalse(res);
  });
});

describe("envQuestionCondition", async () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  it("case 1", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
      [QuestionNames.AadAppManifestFilePath]: "aadAppManifest",
      [QuestionNames.TeamsAppManifestFilePath]: "teamsAppManifest",
      [QuestionNames.collaborationAppType]: [
        CollaborationConstants.TeamsAppQuestionId,
        CollaborationConstants.AadAppQuestionId,
      ],
    };
    sandbox.stub(CollaborationUtil, "loadManifestId").callsFake(async (manifestFilePath) => {
      return manifestFilePath == "teamsAppManifest" ? ok("teamsAppId") : ok("aadAppId");
    });
    sandbox.stub(CollaborationUtil, "requireEnvQuestion").resolves(true);
    const res = await envQuestionCondition(inputs);
    assert.isTrue(res);
  });

  it("case 2", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
      [QuestionNames.AadAppManifestFilePath]: "aadAppManifest",
      [QuestionNames.TeamsAppManifestFilePath]: "teamsAppManifest",
      [QuestionNames.collaborationAppType]: [
        CollaborationConstants.TeamsAppQuestionId,
        CollaborationConstants.AadAppQuestionId,
      ],
    };
    sandbox.stub(CollaborationUtil, "loadManifestId").callsFake(async (manifestFilePath) => {
      return manifestFilePath == "teamsAppManifest" ? ok("teamsAppId") : ok("aadAppId");
    });
    sandbox
      .stub(CollaborationUtil, "requireEnvQuestion")
      .onFirstCall()
      .resolves(false)
      .onSecondCall()
      .resolves(true);
    const res = await envQuestionCondition(inputs);
    assert.isTrue(res);
  });

  it("case 3", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
      [QuestionNames.AadAppManifestFilePath]: "aadAppManifest",
      [QuestionNames.TeamsAppManifestFilePath]: "teamsAppManifest",
      [QuestionNames.collaborationAppType]: [
        CollaborationConstants.TeamsAppQuestionId,
        CollaborationConstants.AadAppQuestionId,
      ],
    };
    sandbox.stub(CollaborationUtil, "loadManifestId").resolves(err(new UserError({})));
    const res = await envQuestionCondition(inputs);
    assert.isFalse(res);
  });

  it("case 4", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
      [QuestionNames.AadAppManifestFilePath]: "aadAppManifest",
      [QuestionNames.collaborationAppType]: [CollaborationConstants.AadAppQuestionId],
    };
    sandbox.stub(CollaborationUtil, "loadManifestId").resolves(err(new UserError({})));
    const res = await envQuestionCondition(inputs);
    assert.isFalse(res);
  });

  it("case 5", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
      [QuestionNames.collaborationAppType]: [
        CollaborationConstants.TeamsAppQuestionId,
        CollaborationConstants.AadAppQuestionId,
      ],
    };
    const res = await envQuestionCondition(inputs);
    assert.isFalse(res);
  });
});
