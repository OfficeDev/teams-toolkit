// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ResourceManagementClient } from "@azure/arm-resources";
import {
  ConditionFunc,
  FuncValidation,
  Inputs,
  ManifestUtil,
  MultiSelectQuestion,
  OptionItem,
  Platform,
  Question,
  SingleSelectQuestion,
  TeamsAppManifest,
  TextInputQuestion,
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
import { FeatureFlagName } from "../../src/common/constants";
import { manifestUtils } from "../../src/component/driver/teamsApp/utils/ManifestUtils";
import {
  newResourceGroupOption,
  resourceGroupHelper,
  resourceGroupQuestionNode,
  validateResourceGroupName,
} from "../../src/component/utils/ResourceGroupHelper";
import { envUtil } from "../../src/component/utils/envUtil";
import { CollaborationConstants, CollaborationUtil } from "../../src/core/collaborator";
import { setTools } from "../../src/common/globalVars";
import { SPFxImportFolderQuestion, questionNodes } from "../../src/question";
import {
  PluginAvailabilityOptions,
  QuestionNames,
  TeamsAppValidationOptions,
} from "../../src/question/constants";
import {
  apiSpecApiKeyQuestion,
  createNewEnvQuestionNode,
  envQuestionCondition,
  isAadMainifestContainsPlaceholder,
  newEnvNameValidation,
  oauthQuestion,
  selectAadAppManifestQuestionNode,
  selectAadManifestQuestion,
  selectLocalTeamsAppManifestQuestion,
  selectPluginAvailabilityQuestion,
  selectTeamsAppManifestQuestion,
} from "../../src/question/other";
import { QuestionTreeVisitor, traverse } from "../../src/ui/visitor";
import { MockedAzureTokenProvider } from "../core/other.test";
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
      const node = questionNodes.addWebpart();

      await traverse(node, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, [
        QuestionNames.SPFxFolder,
        QuestionNames.SPFxWebpartName,
        QuestionNames.SPFxFramework,
        QuestionNames.TeamsAppManifestFilePath,
        QuestionNames.ConfirmManifest,
        QuestionNames.LocalTeamsAppManifestFilePath,
        QuestionNames.ConfirmLocalManifest,
      ]);
    });
  });

  describe("selectTeamsAppManifest", async () => {
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
        if (question.name === QuestionNames.TeamsAppManifestFilePath) {
          return ok({ type: "success", result: "teamsAppManifest" });
        } else if (question.name === QuestionNames.ConfirmManifest) {
          return ok({ type: "success", result: "manifest" });
        }
        return ok({ type: "success", result: undefined });
      };
      const node = questionNodes.selectTeamsAppManifest();
      await traverse(node, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, [
        QuestionNames.TeamsAppManifestFilePath,
        QuestionNames.ConfirmManifest,
      ]);
    });
  });
  describe("validateTeamsApp", async () => {
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
        if (question.name === QuestionNames.ValidateMethod) {
          return ok({ type: "success", result: TeamsAppValidationOptions.schema().id });
        } else if (question.name === QuestionNames.TeamsAppManifestFilePath) {
          return ok({ type: "success", result: "teamsAppManifest" });
        } else if (question.name === QuestionNames.ConfirmManifest) {
          return ok({ type: "success", result: "manifest" });
        }
        return ok({ type: "success", result: undefined });
      };
      const res = questionNodes.validateTeamsApp();

      await traverse(res, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, [
        QuestionNames.ValidateMethod,
        QuestionNames.TeamsAppManifestFilePath,
      ]);
    });
  });
  describe("previewWithTeamsAppManifest", async () => {
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
        } else if (question.name === QuestionNames.M365Host) {
          return ok({ type: "success", result: "test" });
        } else if (question.name === QuestionNames.TeamsAppManifestFilePath) {
          return ok({ type: "success", result: "test" });
        } else if (question.name === QuestionNames.ConfirmManifest) {
          return ok({ type: "success", result: "manifest" });
        }
        return ok({ type: "success", result: undefined });
      };
      const res = questionNodes.previewWithTeamsAppManifest();

      await traverse(res, inputs, ui, undefined, visitor);
      assert.deepEqual(questionNames, [
        QuestionNames.M365Host,
        QuestionNames.TeamsAppManifestFilePath,
        QuestionNames.ConfirmManifest,
      ]);
    });
  });
  it("SPFxImportFolderQuestion", () => {
    const projectDir = "\\test";

    const res = (SPFxImportFolderQuestion(true) as any).default({ projectPath: projectDir });

    assert.equal(path.resolve(res), path.resolve("\\test/src"));
  });
});

describe("listCollaborator", async () => {
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
    const res = questionNodes.listCollaborator();
    await traverse(res, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, []);
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
    const res = questionNodes.listCollaborator();
    await traverse(res, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [
      QuestionNames.collaborationAppType,
      QuestionNames.TeamsAppManifestFilePath,
      QuestionNames.ConfirmManifest,
      QuestionNames.AadAppManifestFilePath,
      QuestionNames.ConfirmAadManifest,
      QuestionNames.Env,
    ]);
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
    const res = questionNodes.listCollaborator();
    await traverse(res, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [
      QuestionNames.collaborationAppType,
      QuestionNames.TeamsAppManifestFilePath,
      QuestionNames.ConfirmManifest,
      QuestionNames.Env,
    ]);
  });
});
describe("grantPermission", async () => {
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
    const res = questionNodes.grantPermission();
    await traverse(res, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, []);
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
      await callFuncs(question, inputs, "xxx@xxx.com");
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
    const res = questionNodes.grantPermission();
    await traverse(res, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [
      QuestionNames.collaborationAppType,
      QuestionNames.TeamsAppManifestFilePath,
      QuestionNames.ConfirmManifest,
      QuestionNames.AadAppManifestFilePath,
      QuestionNames.ConfirmAadManifest,
      QuestionNames.Env,
      QuestionNames.UserEmail,
    ]);
  });
});
describe("deployAadManifest", async () => {
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
    const res = questionNodes.deployAadManifest();
    await traverse(res, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, []);
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

describe("resourceGroupQuestionNode", async () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("validateResourceGroupName invalid pattern", () => {
    const res = validateResourceGroupName("!!!!!", { platform: Platform.VSCode });
    assert.isTrue(res !== undefined);
  });
  it("validateResourceGroupName already exists", () => {
    const res = validateResourceGroupName("myrg123", {
      platform: Platform.VSCode,
      existingResourceGroupNames: ["myrg123"],
    });
    assert.isTrue(res !== undefined);
  });
  it("create new resource group success", async () => {
    sandbox.stub(resourceGroupHelper, "listResourceGroups").resolves(
      ok([
        ["g1", "East US"],
        ["g2", "Center US"],
      ])
    );
    sandbox.stub(resourceGroupHelper, "getLocations").resolves(ok(["East US", "Center US"]));
    const mockSubscriptionId = "mockSub";
    const defaultRG = "defaultRG";
    const accountProvider = new MockedAzureTokenProvider();
    const mockToken = await accountProvider.getIdentityCredentialAsync();
    const mockRmClient = new ResourceManagementClient(mockToken, mockSubscriptionId);
    sandbox.stub(resourceGroupHelper, "createRmClient").resolves(mockRmClient);
    const node = resourceGroupQuestionNode(accountProvider, mockSubscriptionId, defaultRG);
    assert.isTrue(node !== undefined);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
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
      await callFuncs(question, inputs, "testrg123");
      if (question.name === QuestionNames.TargetResourceGroupName) {
        return ok({
          type: "success",
          result: { id: newResourceGroupOption, label: newResourceGroupOption },
        });
      } else if (question.name === QuestionNames.NewResourceGroupName) {
        return ok({ type: "success", result: "testrg123" });
      } else if (question.name === QuestionNames.NewResourceGroupLocation) {
        return ok({ type: "success", result: "East US" });
      }
      return ok({ type: "success", result: undefined });
    };
    await traverse(node, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [
      QuestionNames.TargetResourceGroupName,
      QuestionNames.NewResourceGroupName,
      QuestionNames.NewResourceGroupLocation,
    ]);
  });

  it("select existing resource group", async () => {
    sandbox.stub(resourceGroupHelper, "listResourceGroups").resolves(
      ok([
        ["g1", "East US"],
        ["g2", "Center US"],
      ])
    );
    const mockSubscriptionId = "mockSub";
    const defaultRG = "defaultRG";
    const accountProvider = new MockedAzureTokenProvider();
    const mockToken = await accountProvider.getIdentityCredentialAsync();
    const mockRmClient = new ResourceManagementClient(mockToken, mockSubscriptionId);
    sandbox.stub(resourceGroupHelper, "createRmClient").resolves(mockRmClient);
    const node = resourceGroupQuestionNode(accountProvider, mockSubscriptionId, defaultRG);
    assert.isTrue(node !== undefined);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
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
      if (question.name === QuestionNames.TargetResourceGroupName) {
        return ok({
          type: "success",
          result: { id: "g1", label: newResourceGroupOption },
        });
      }
      return ok({ type: "success", result: undefined });
    };
    await traverse(node, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [QuestionNames.TargetResourceGroupName]);
  });
});

describe("createNewEnvQuestionNode", async () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("createNewEnv", () => {
    const res = questionNodes.createNewEnv();
    assert.isTrue(res !== undefined);
  });
  it("newEnvNameValidation invalid pattern", () => {
    const res = newEnvNameValidation("!!!!!", { platform: Platform.VSCode, projectPath: "." });
    assert.isTrue(res !== undefined);
  });
  it("newEnvNameValidation invlid local", () => {
    const res = newEnvNameValidation("local", {
      platform: Platform.VSCode,
    });
    assert.isTrue(res !== undefined);
  });
  it("newEnvNameValidation exists", () => {
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev1", "dev2"]));
    const res = newEnvNameValidation("dev1", {
      platform: Platform.VSCode,
      projectPath: ".",
    });
    assert.isTrue(res !== undefined);
  });
  it("newEnvNameValidation listEnv return error", () => {
    sandbox.stub(envUtil, "listEnv").resolves(err(new UserError({})));
    const res = newEnvNameValidation("dev1", {
      platform: Platform.VSCode,
      projectPath: ".",
    });
    assert.isTrue(res !== undefined);
  });
  it("happy path", async () => {
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev1", "dev2"]));
    const node = createNewEnvQuestionNode();
    assert.isTrue(node !== undefined);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
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
      await callFuncs(question, inputs, "dev3");
      if (question.name === QuestionNames.NewTargetEnvName) {
        return ok({ type: "success", result: "dev3" });
      } else if (question.name === QuestionNames.SourceEnvName) {
        return ok({ type: "success", result: "dev2" });
      }
      return ok({ type: "success", result: undefined });
    };
    await traverse(node, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [QuestionNames.NewTargetEnvName, QuestionNames.SourceEnvName]);
  });
});

describe("copilotPluginQuestions", async () => {
  afterEach(() => {
    sinon.restore();
  });

  it("happy path", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
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
      await callFuncs(question, inputs, "xxx@xxx.com");
      if (question.name == QuestionNames.ApiSpecLocation) {
        return ok({
          type: "success",
          result: ["https://example.json"],
        });
      } else if (question.name == QuestionNames.ApiOperation) {
        return ok({
          type: "success",
          result: [
            {
              id: "testOperation1",
              label: "operation1",
              groupName: "1",
              data: {
                serverUrl: "https://server1",
              },
            },
          ],
        });
      }
      return ok({ type: "success", result: undefined });
    };
    const res = questionNodes.copilotPluginAddAPI();
    await traverse(res, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [QuestionNames.ApiSpecLocation, QuestionNames.ApiOperation]);
  });
});

describe("selectTeamsAppManifestQuestion", async () => {
  it("default for CLI_HELP", async () => {
    const question = selectTeamsAppManifestQuestion();
    if (typeof question.default === "function") {
      const res = await question.default({ platform: Platform.CLI_HELP });
      assert.equal(res, "./appPackage/manifest.json");
    }
  });
});

describe("selectLocalTeamsAppManifestQuestion", async () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("default for CLI_HELP", async () => {
    const question = selectLocalTeamsAppManifestQuestion();
    if (typeof question.default === "function") {
      const res = await question.default({ platform: Platform.CLI_HELP });
      assert.equal(res, "./appPackage/manifest.local.json");
    }
  });
  it("default for vsc, path exists", async () => {
    sandbox.stub(fs, "pathExistsSync").returns(true);
    const question = selectLocalTeamsAppManifestQuestion();
    if (typeof question.default === "function") {
      const res = await question.default({ platform: Platform.VSCode, projectPath: "./" });
      assert.isDefined(res);
    }
  });
});
describe("selectAadManifestQuestion", async () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn = () => {};
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("default for CLI_HELP", async () => {
    const question = selectAadManifestQuestion();
    if (typeof question.default === "function") {
      const res = await question.default({ platform: Platform.CLI_HELP });
      assert.equal(res, "./aad.manifest.json");
    }
  });
  it("default for VSCode", async () => {
    sandbox.stub(fs, "pathExistsSync").returns(false);
    const question = selectAadManifestQuestion();
    if (typeof question.default === "function") {
      const res = await question.default({ platform: Platform.VSCode, projectPath: "./" });
      assert.isUndefined(res);
    }
  });
  it("CLI V3", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_CLI_V3: "true",
    });
    const question = selectAadManifestQuestion();
    assert.equal(question.cliName, "entra-app-manifest-file");
  });
});

describe("apiKeyQuestion", async () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn = () => {};
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("will pop up question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
    };
    const question = apiSpecApiKeyQuestion();
    const condition = question.condition;
    const res = await (condition as ConditionFunc)(inputs);
    assert.equal(res, true);
    const confirmQuesion = question.children![0];
    assert.equal(confirmQuesion.data.name, "api-key-confirm");
  });

  it("will not pop up question due to api key exists", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
    };
    inputs.outputEnvVarNames.set("registrationId", "registrationId");
    mockedEnvRestore = mockedEnv({
      registrationId: "fake-id",
    });
    const question = apiSpecApiKeyQuestion();
    const condition = question.condition;
    const res = await (condition as ConditionFunc)(inputs);
    assert.equal(res, false);
  });

  it("will not pop up question due to secret exists", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
      primaryClientSecret: "fakeClientSecret",
    };
    const question = apiSpecApiKeyQuestion();
    const condition = question.condition;
    const res = await (condition as ConditionFunc)(inputs);
    assert.equal(res, false);
  });

  it("validation passed", async () => {
    const question = apiSpecApiKeyQuestion();
    const validation = (question.data as TextInputQuestion).validation;
    const result = (validation as FuncValidation<string>).validFunc("mockedApiKey");
    assert.equal(result, undefined);
  });

  it("validation failed due to length", async () => {
    const question = apiSpecApiKeyQuestion();
    const validation = (question.data as TextInputQuestion).validation;
    const result = (validation as FuncValidation<string>).validFunc("abc");
    assert.equal(
      result,
      "Client secret is invalid. The length of secret should be >= 10 and <= 128"
    );
  });
});

describe("oauthQuestion", async () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn = () => {};
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("will pop up question for client id, client secret and confirm", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
    };
    const question = oauthQuestion();

    const clientIdQuestion = question.children![0];
    const clientIdCondition = clientIdQuestion.condition;
    const clientIdRes = await (clientIdCondition as ConditionFunc)(inputs);
    assert.equal(clientIdRes, true);

    const clientSecretQuestion = question.children![1];
    const clientSecretCondition = clientSecretQuestion.condition;
    const clientSecretRes = await (clientSecretCondition as ConditionFunc)(inputs);
    assert.equal(clientSecretRes, true);

    const confirmQuesion = question.children![2];
    const confirmCondition = confirmQuesion.condition;
    const confirmRes = await (confirmCondition as ConditionFunc)(inputs);
    assert.equal(confirmRes, true);
  });

  it("will pop up question for client id, and confirm", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
      clientSecret: "fakeClientSecret",
    };
    const question = oauthQuestion();

    const clientIdQuestion = question.children![0];
    const clientIdCondition = clientIdQuestion.condition;
    const clientIdRes = await (clientIdCondition as ConditionFunc)(inputs);
    assert.equal(clientIdRes, true);

    const clientSecretQuestion = question.children![1];
    const clientSecretCondition = clientSecretQuestion.condition;
    const clientSecretRes = await (clientSecretCondition as ConditionFunc)(inputs);
    assert.equal(clientSecretRes, false);

    const confirmQuesion = question.children![2];
    const confirmCondition = confirmQuesion.condition;
    const confirmRes = await (confirmCondition as ConditionFunc)(inputs);
    assert.equal(confirmRes, true);
  });

  it("will pop up question for client secret, and confirm", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
      clientId: "fakeClientId",
    };
    const question = oauthQuestion();

    const clientIdQuestion = question.children![0];
    const clientIdCondition = clientIdQuestion.condition;
    const clientIdRes = await (clientIdCondition as ConditionFunc)(inputs);
    assert.equal(clientIdRes, false);

    const clientSecretQuestion = question.children![1];
    const clientSecretCondition = clientSecretQuestion.condition;
    const clientSecretRes = await (clientSecretCondition as ConditionFunc)(inputs);
    assert.equal(clientSecretRes, true);

    const confirmQuesion = question.children![2];
    const confirmCondition = confirmQuesion.condition;
    const confirmRes = await (confirmCondition as ConditionFunc)(inputs);
    assert.equal(confirmRes, true);
  });

  it("will not pop up question since client id, client secret exists", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
      clientId: "fakeClientId",
      clientSecret: "fakeClientSecret",
    };
    const question = oauthQuestion();

    const clientIdQuestion = question.children![0];
    const clientIdCondition = clientIdQuestion.condition;
    const clientIdRes = await (clientIdCondition as ConditionFunc)(inputs);
    assert.equal(clientIdRes, false);

    const clientSecretQuestion = question.children![1];
    const clientSecretCondition = clientSecretQuestion.condition;
    const clientSecretRes = await (clientSecretCondition as ConditionFunc)(inputs);
    assert.equal(clientSecretRes, false);

    const confirmQuesion = question.children![2];
    const confirmCondition = confirmQuesion.condition;
    const confirmRes = await (confirmCondition as ConditionFunc)(inputs);
    assert.equal(confirmRes, false);
  });

  it("will not pop up question due to registrationId exists", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
    };
    inputs.outputEnvVarNames.set("configurationId", "configurationId");
    mockedEnvRestore = mockedEnv({
      configurationId: "fake-id",
    });
    const question = oauthQuestion();
    const condition = question.condition;
    const res = await (condition as ConditionFunc)(inputs);
    assert.equal(res, false);
  });

  it("client secret validation passed", async () => {
    const question = oauthQuestion().children![1];
    const validation = (question.data as TextInputQuestion).validation;
    const result = (validation as FuncValidation<string>).validFunc("mockedClientSecret");
    assert.equal(result, undefined);
  });

  it("client secret validation failed due to length", async () => {
    const question = oauthQuestion().children![1];
    const validation = (question.data as TextInputQuestion).validation;
    const result = (validation as FuncValidation<string>).validFunc("abc");
    assert.equal(
      result,
      "Client secret is invalid. The length of secret should be >= 10 and <= 128"
    );
  });

  it("client id additionalValidationOnAccept passed", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
    };
    const question = oauthQuestion().children![0];
    const validation = (question.data as TextInputQuestion).additionalValidationOnAccept;
    const result = (validation as FuncValidation<string>).validFunc("mockedClientId", inputs);
    assert.equal(result, undefined);
  });

  it("client secret additionalValidationOnAccept passed", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      outputEnvVarNames: new Map<string, string>(),
    };
    const question = oauthQuestion().children![1];
    const validation = (question.data as TextInputQuestion).additionalValidationOnAccept;
    const result = (validation as FuncValidation<string>).validFunc("mockedClientSecret", inputs);
    assert.equal(result, undefined);
  });
});

describe("addPluginQuestionNode", async () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn = () => {};
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      [FeatureFlagName.CustomizeGpt]: "true",
    });
  });

  it("success: can add a plugin or an action", async () => {
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({} as TeamsAppManifest));
    sandbox.stub(ManifestUtil, "parseCommonProperties").returns({
      capabilities: ["copilotGpt"],
      isApiME: false,
      isSPFx: false,
      id: "1",
      version: "1",
      manifestVersion: "",
      isApiMeAAD: false,
    });
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
      if (QuestionNames.TeamsAppManifestFilePath) {
        return ok({
          type: "success",
          result: "manifest.json",
        });
      } else if (QuestionNames.PluginAvailability) {
        const select = question as SingleSelectQuestion;
        const options = await select.dynamicOptions!(inputs);
        assert.isTrue(options.length === 3);
        return ok({ type: "success", result: PluginAvailabilityOptions.action().id });
      } else if (question.name === QuestionNames.ApiSpecLocation) {
        return ok({ type: "success", result: "test.yaml" });
      } else if (question.name === QuestionNames.ApiOperation) {
        return ok({ type: "success", result: "[GET /repairs]" });
      }
      return ok({ type: "success", result: undefined });
    };
    const node = questionNodes.addPlugin();

    await traverse(node, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [
      QuestionNames.TeamsAppManifestFilePath,
      QuestionNames.PluginAvailability,
      QuestionNames.ApiSpecLocation,
      QuestionNames.ApiOperation,
    ]);
  });

  it("success: can add an action only", async () => {
    mockedEnvRestore = mockedEnv({
      [FeatureFlagName.CustomizeGpt]: "true",
    });
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({} as TeamsAppManifest));
    sandbox.stub(ManifestUtil, "parseCommonProperties").returns({
      capabilities: ["copilotGpt", "plugin"],
      isApiME: false,
      isSPFx: false,
      id: "1",
      version: "1",
      manifestVersion: "",
      isApiMeAAD: false,
    });
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
      if (QuestionNames.TeamsAppManifestFilePath) {
        return ok({
          type: "success",
          result: "manifest.json",
        });
      } else if (QuestionNames.PluginAvailability) {
        const select = question as SingleSelectQuestion;
        const options = await select.dynamicOptions!(inputs);
        assert.isTrue(options.length === 1);
        assert.isTrue((options[0] as OptionItem).id === PluginAvailabilityOptions.action().id);
        return ok({ type: "success", result: PluginAvailabilityOptions.action().id });
      } else if (question.name === QuestionNames.ApiSpecLocation) {
        return ok({ type: "success", result: "test.yaml" });
      } else if (question.name === QuestionNames.ApiOperation) {
        const select = question as MultiSelectQuestion;
        const cliDescription = select.cliDescription;
        assert.isTrue(cliDescription?.includes("Copilot"));
        return ok({ type: "success", result: "[GET /repairs]" });
      }
      return ok({ type: "success", result: undefined });
    };
    const node = questionNodes.addPlugin();

    await traverse(node, inputs, ui, undefined, visitor);
    assert.deepEqual(questionNames, [
      QuestionNames.TeamsAppManifestFilePath,
      QuestionNames.PluginAvailability,
      QuestionNames.ApiSpecLocation,
      QuestionNames.ApiOperation,
    ]);
  });

  describe("selectPluginAvailabilityQuestion", async () => {
    it("error: cannot add as the project is not declarative Copilot", async () => {
      sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({} as TeamsAppManifest));
      sandbox.stub(ManifestUtil, "parseCommonProperties").returns({
        capabilities: [],
        isApiME: false,
        isSPFx: false,
        id: "1",
        version: "1",
        manifestVersion: "",
        isApiMeAAD: false,
      });
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: "./test",
      };

      const question = selectPluginAvailabilityQuestion();
      let error;
      try {
        await question.dynamicOptions!(inputs);
      } catch (e) {
        error = e;
      }

      console.log(error);
      assert.isTrue(error !== undefined);
    });

    it("error: readManifestError", async () => {
      sandbox
        .stub(manifestUtils, "_readAppManifest")
        .resolves(err(new UserError("error", "error", "error", "error")));

      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: "./test",
      };

      const question = selectPluginAvailabilityQuestion();
      let error;
      try {
        await question.dynamicOptions!(inputs);
      } catch (e) {
        error = e;
      }

      console.log(error);
      assert.isTrue(error !== undefined);
    });
  });
});
