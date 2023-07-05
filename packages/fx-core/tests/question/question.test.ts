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
import { RestoreFn } from "mocked-env";
import * as path from "path";
import sinon from "sinon";
import { CollaborationConstants, QuestionTreeVisitor, envUtil, traverse } from "../../src";
import { CollaborationUtil } from "../../src/core/collaborator";
import { setTools } from "../../src/core/globalVars";
import { QuestionNames, SPFxImportFolderQuestion, questions } from "../../src/question";
import {
  envQuestionCondition,
  isAadMainifestContainsPlaceholder,
  selectAadAppManifestQuestionNode,
} from "../../src/question/other";
import { MockTools, MockUserInteraction } from "../core/utils";
import { callFuncs } from "./create.test";

const ui = new MockUserInteraction();

describe("none scaffold questions", () => {
  const mockedEnvRestore: RestoreFn = () => {};
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  describe("addWebpart", async () => {
    it("happy path", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: "./test",
      };

      const questionNames: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questionNames.push(question.name);
        await callFuncs(question, inputs);
        if (QuestionNames.SPFxFolder) {
          return ok({
            type: "success",
            result: ".",
          });
        } else if (QuestionNames.SPFxWebpartName) {
          return ok({ type: "success", result: "test" });
        } else if (question.name === QuestionNames.TeamsAppManifestFilePath) {
          return ok({ type: "success", result: "teamsAppManifest" });
        } else if (question.name === QuestionNames.ConfirmManifest) {
          return ok({ type: "success", result: "manifest" });
        } else if (question.name === QuestionNames.LocalTeamsAppManifestFilePath) {
          return ok({ type: "success", result: "teamsAppManifest" });
        } else if (question.name === QuestionNames.ConfirmLocalManifest) {
          return ok({ type: "success", result: "manifest" });
        }
        return ok({ type: "success", result: undefined });
      };
      const res = questions.addWebpart();

      assert.isTrue(res.isOk());
      if (res.isOk()) {
        await traverse(res.value!, inputs, ui, undefined, visitor);
        assert.deepEqual(questionNames, [
          QuestionNames.TeamsAppManifestFilePath,
          QuestionNames.ConfirmManifest,
          QuestionNames.LocalTeamsAppManifestFilePath,
          QuestionNames.ConfirmLocalManifest,
        ]);
      }
    });
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
    const nodeRes = await questions.selectTeamsAppManifest();
    assert.isTrue(nodeRes.isOk());
  });

  it("validate app package question", async () => {
    const nodeRes = await questions.selectTeamsAppValidationMethod();
    assert.isTrue(nodeRes.isOk());
  });
});

describe("getQuestionsForListCollaborator()", async () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });
  it("CLI_HELP", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
    };
    const questionNames: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questionNames.push(question.name);
      return ok({ type: "success", result: undefined });
    };
    const res = questions.listCollaborator();
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      await traverse(res.value!, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, []);
    }
  });
  it("happy path: both are selected", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    sandbox.stub(CollaborationUtil, "loadManifestId").callsFake(async (manifestFilePath) => {
      return manifestFilePath == "teamsAppManifest" ? ok("teamsAppId") : ok("aadAppId");
    });
    sandbox.stub(CollaborationUtil, "requireEnvQuestion").resolves(true);
    sandbox.stub(fs, "pathExistsSync").returns(true);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "local"]));
    const questionNames: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questionNames.push(question.name);
      await callFuncs(question, inputs);
      if (question.name === QuestionNames.collaborationAppType) {
        return ok({
          type: "success",
          result: [
            CollaborationConstants.TeamsAppQuestionId,
            CollaborationConstants.AadAppQuestionId,
          ],
        });
      } else if (question.name === QuestionNames.AadAppManifestFilePath) {
        return ok({ type: "success", result: "aadAppManifest" });
      } else if (question.name === QuestionNames.TeamsAppManifestFilePath) {
        return ok({ type: "success", result: "teamsAppManifest" });
      } else if (question.name === QuestionNames.Env) {
        return ok({ type: "success", result: "dev" });
      } else if (question.name === QuestionNames.ConfirmManifest) {
        return ok({ type: "success", result: "manifest" });
      } else if (question.name === QuestionNames.ConfirmAadManifest) {
        return ok({ type: "success", result: "manifest" });
      }
      return ok({ type: "success", result: undefined });
    };
    const res = questions.listCollaborator();
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      await traverse(res.value!, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, [
        QuestionNames.collaborationAppType,
        QuestionNames.TeamsAppManifestFilePath,
        QuestionNames.ConfirmManifest,
        QuestionNames.AadAppManifestFilePath,
        QuestionNames.ConfirmAadManifest,
        QuestionNames.Env,
      ]);
    }
  });
  it("happy path: teams app only", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    sandbox.stub(CollaborationUtil, "loadManifestId").callsFake(async (manifestFilePath) => {
      return manifestFilePath == "teamsAppManifest" ? ok("teamsAppId") : ok("aadAppId");
    });
    sandbox.stub(CollaborationUtil, "requireEnvQuestion").resolves(true);
    sandbox.stub(fs, "pathExistsSync").returns(true);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "local"]));
    const questionNames: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questionNames.push(question.name);
      await callFuncs(question, inputs);
      if (question.name === QuestionNames.collaborationAppType) {
        return ok({
          type: "success",
          result: [CollaborationConstants.TeamsAppQuestionId],
        });
      } else if (question.name === QuestionNames.TeamsAppManifestFilePath) {
        return ok({ type: "success", result: "teamsAppManifest" });
      } else if (question.name === QuestionNames.Env) {
        return ok({ type: "success", result: "dev" });
      } else if (question.name === QuestionNames.ConfirmManifest) {
        return ok({ type: "success", result: "manifest" });
      }
      return ok({ type: "success", result: undefined });
    };
    const res = questions.listCollaborator();
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      await traverse(res.value!, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, [
        QuestionNames.collaborationAppType,
        QuestionNames.TeamsAppManifestFilePath,
        QuestionNames.ConfirmManifest,
        QuestionNames.Env,
      ]);
    }
  });
});
describe("getQuestionsForGrantPermission()", async () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });
  it("CLI_HELP", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
    };
    const questionNames: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questionNames.push(question.name);
      return ok({ type: "success", result: undefined });
    };
    const res = questions.grantPermission();
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      await traverse(res.value!, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, []);
    }
  });

  it("happy path", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    sandbox.stub(CollaborationUtil, "loadManifestId").callsFake(async (manifestFilePath) => {
      return manifestFilePath == "teamsAppManifest" ? ok("teamsAppId") : ok("aadAppId");
    });
    sandbox.stub(CollaborationUtil, "requireEnvQuestion").resolves(true);
    sandbox.stub(fs, "pathExistsSync").returns(true);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "test"]));
    const tools = new MockTools();
    setTools(tools);
    sandbox.stub(tools.tokenProvider.m365TokenProvider, "getJsonObject").resolves(
      ok({
        tid: "mock_project_tenant_id",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      })
    );
    const questionNames: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questionNames.push(question.name);
      await callFuncs(question, inputs);
      if (question.name === QuestionNames.collaborationAppType) {
        return ok({
          type: "success",
          result: [
            CollaborationConstants.TeamsAppQuestionId,
            CollaborationConstants.AadAppQuestionId,
          ],
        });
      } else if (question.name === QuestionNames.AadAppManifestFilePath) {
        return ok({ type: "success", result: "aadAppManifest" });
      } else if (question.name === QuestionNames.TeamsAppManifestFilePath) {
        return ok({ type: "success", result: "teamsAppManifest" });
      } else if (question.name === QuestionNames.Env) {
        return ok({ type: "success", result: "dev" });
      } else if (question.name === QuestionNames.ConfirmManifest) {
        return ok({ type: "success", result: "manifest" });
      } else if (question.name === QuestionNames.ConfirmAadManifest) {
        return ok({ type: "success", result: "manifest" });
      } else if (question.name === QuestionNames.UserEmail) {
        return ok({ type: "success", result: "xxx@xxx.com" });
      }
      return ok({ type: "success", result: undefined });
    };
    const res = questions.grantPermission();
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      await traverse(res.value!, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, [
        QuestionNames.collaborationAppType,
        QuestionNames.TeamsAppManifestFilePath,
        QuestionNames.ConfirmManifest,
        QuestionNames.AadAppManifestFilePath,
        QuestionNames.ConfirmAadManifest,
        QuestionNames.Env,
        QuestionNames.UserEmail,
      ]);
    }
  });
});
describe("getQuestionForDeployAadManifest()", async () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });
  it("CLI_HELP", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
    };
    const questionNames: string[] = [];
    const visitor: QuestionTreeVisitor = async (
      question: Question,
      ui: UserInteraction,
      inputs: Inputs,
      step?: number,
      totalSteps?: number
    ) => {
      questionNames.push(question.name);
      return ok({ type: "success", result: undefined });
    };
    const res = questions.deployAadManifest();
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      await traverse(res.value!, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, []);
    }
  });
  it("traverse without projectPath", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
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
    assert.deepEqual(questions, [QuestionNames.AadAppManifestFilePath]);
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
    assert.deepEqual(questions, [
      QuestionNames.AadAppManifestFilePath,
      QuestionNames.ConfirmAadManifest,
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
    assert.deepEqual(questions, [
      QuestionNames.AadAppManifestFilePath,
      QuestionNames.ConfirmAadManifest,
    ]);
  });
  it("isAadMainifestContainsPlaceholder return true", async () => {
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
