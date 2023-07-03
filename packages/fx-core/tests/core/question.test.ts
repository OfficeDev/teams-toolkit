import "mocha";

import chai from "chai";
import * as fs from "fs-extra";
import os from "os";
import path from "path";
import * as sinon from "sinon";

import {
  FuncValidation,
  Inputs,
  InputsWithProjectPath,
  ok,
  OptionItem,
  Platform,
  QTreeNode,
} from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../src/common/localizeUtils";
import {
  BotOptionItem,
  CommandAndResponseOptionItem,
  DashboardOptionItem,
  M365SearchAppOptionItem,
  M365SsoLaunchPageOptionItem,
  MessageExtensionNewUIItem,
  NewProjectTypeBotOptionItem,
  NewProjectTypeMessageExtensionOptionItem,
  NewProjectTypeOutlookAddinOptionItem,
  NewProjectTypeTabOptionItem,
  NotificationOptionItem,
  TabNonSsoItem,
  TabSPFxItem,
  WorkflowOptionItem,
} from "../../src/component/constants";
import {
  ImportAddinProjectItem,
  OfficeAddinItems,
} from "../../src/component/generator/officeAddin/question";
import { environmentManager } from "../../src/core/environment";
import {
  addOfficeAddinQuestions,
  getQuestionsForCreateProjectV2,
} from "../../src/core/middleware/questionModel";
import {
  CoreQuestionNames,
  createAppNameQuestion,
  createCapabilityQuestionPreview,
  createNewProjectQuestionWith2Layers,
  getBotProjectQuestionNode,
  getMessageExtensionTypeProjectQuestionNode,
  getOutlookAddinTypeProjectQuestionNode,
  getQuestionForDeployAadManifest,
  getTabTypeProjectQuestionNode,
  ProgrammingLanguageQuestion,
  ScratchOptionYesVSC,
  validateAadManifestContainsPlaceholder,
} from "../../src/core/question";
import { randomAppName } from "./utils";

describe("Programming Language Questions", async () => {
  it("should return csharp on VS platform", async () => {
    chai.assert.isTrue(ProgrammingLanguageQuestion.dynamicOptions !== undefined);
    if (ProgrammingLanguageQuestion.dynamicOptions === undefined) {
      throw "unreachable";
    }
    const inputs: Inputs = { platform: Platform.VS };
    const questions = await ProgrammingLanguageQuestion.dynamicOptions(inputs);
    chai.assert.isTrue(questions !== undefined);
    chai.assert.isArray(questions);
    chai.assert.lengthOf(questions, 1);
    chai.assert.property(questions[0], "id");
    chai.assert.equal((questions[0] as any).id, "csharp");
  });
});

describe("createCapabilityQuestionPreview()", () => {
  beforeEach(() => {
    sinon.restore();
    sinon.stub(process, "env").value({
      BOT_NOTIFICATION_ENABLED: "true",
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return single select question", () => {
    // Act
    const question = createCapabilityQuestionPreview();
    // Assert
    chai.assert.equal(question.type, "singleSelect");
    chai.assert.equal(question.name, "capabilities");
    chai.assert.deepEqual(question.staticOptions, [
      NotificationOptionItem(),
      CommandAndResponseOptionItem(),
      WorkflowOptionItem(),
      DashboardOptionItem(),
      TabSPFxItem(),
      TabNonSsoItem(),
      BotOptionItem(),
      MessageExtensionNewUIItem(),
      M365SsoLaunchPageOptionItem(),
      M365SearchAppOptionItem(),
    ]);
  });
});

describe("New VSC UI related with createNewProjectQuestionWith2Layers()", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  it("should return 4 type options in first layer question if not from TDP", () => {
    // Act
    const question = createNewProjectQuestionWith2Layers();
    // Assert
    chai.assert.equal(question.type, "singleSelect");
    chai.assert.equal(question.name, "project-type");
    chai.assert.equal(question.title, getLocalizedString("core.createProjectQuestion.title"));
    chai.assert.deepEqual(question.staticOptions, [
      NewProjectTypeBotOptionItem(),
      NewProjectTypeTabOptionItem(),
      NewProjectTypeMessageExtensionOptionItem(),
      NewProjectTypeOutlookAddinOptionItem(),
    ]);
  });

  it("should return 3 type options in first layer question if from TDP", () => {
    // Act
    const question = createNewProjectQuestionWith2Layers({
      teamsAppFromTdp: { id: "1" },
      platform: Platform.VSCode,
    });
    // Assert
    chai.assert.equal(question.type, "singleSelect");
    chai.assert.equal(question.name, "project-type");
    chai.assert.equal(question.title, getLocalizedString("core.createProjectQuestion.title"));
    chai.assert.deepEqual(question.staticOptions, [
      NewProjectTypeBotOptionItem(),
      NewProjectTypeTabOptionItem(),
      NewProjectTypeMessageExtensionOptionItem(),
    ]);
  });

  it("should return 4 bot type options in second layer question", () => {
    // Act
    const question = getBotProjectQuestionNode({} as Inputs);
    // Assert
    chai.assert.equal(question.type, "singleSelect");
    chai.assert.equal(question.name, "capabilities");
    chai.assert.equal(
      question.title,
      getLocalizedString("core.createProjectQuestion.projectType.bot.title")
    );
    chai.assert.deepEqual(question.staticOptions, [
      BotOptionItem(),
      NotificationOptionItem(),
      CommandAndResponseOptionItem(),
      WorkflowOptionItem(),
    ]);
  });

  it("should return 4 bot type options in second layer question with in-product AB test", () => {
    // Act
    const question = getBotProjectQuestionNode({ inProductDoc: true } as Inputs);
    // Assert
    chai.assert.equal(question.type, "singleSelect");
    chai.assert.equal(question.name, "capabilities");
    chai.assert.equal(
      question.title,
      getLocalizedString("core.createProjectQuestion.projectType.bot.title")
    );
    chai.assert.equal((question.staticOptions[3] as OptionItem).data, "cardActionResponse");
  });

  it("should return 4 tab type options in second layer question", () => {
    // Act
    const question = getTabTypeProjectQuestionNode();
    // Assert
    chai.assert.equal(question.type, "singleSelect");
    chai.assert.equal(question.name, "capabilities");
    chai.assert.equal(
      question.title,
      getLocalizedString("core.createProjectQuestion.projectType.tab.title")
    );
    chai.assert.deepEqual(question.staticOptions, [
      TabNonSsoItem(),
      M365SsoLaunchPageOptionItem(),
      DashboardOptionItem(),
      TabSPFxItem(),
    ]);
  });

  it("should return 2 message extension type options in second layer question", () => {
    // Act
    const question = getMessageExtensionTypeProjectQuestionNode();
    // Assert
    chai.assert.equal(question.type, "singleSelect");
    chai.assert.equal(question.name, "capabilities");
    chai.assert.equal(
      question.title,
      getLocalizedString("core.createProjectQuestion.projectType.messageExtension.title")
    );
    chai.assert.deepEqual(question.staticOptions, [
      M365SearchAppOptionItem(),
      MessageExtensionNewUIItem(),
    ]);
  });

  it("should return 2 outlook type options in second layer question", () => {
    // Act
    const question = getOutlookAddinTypeProjectQuestionNode();
    // Assert
    chai.assert.equal(question.type, "singleSelect");
    chai.assert.equal(question.name, "capabilities");
    chai.assert.equal(
      question.title,
      getLocalizedString("core.createProjectQuestion.projectType.outlookAddin.title")
    );
    chai.assert.deepEqual(question.staticOptions, [
      ...OfficeAddinItems(),
      ImportAddinProjectItem(),
    ]);
  });
});

describe("App name question", async () => {
  const question = createAppNameQuestion();
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

describe("addOfficeAddinQuestions()", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should add questions", () => {
    const parent = new QTreeNode({
      type: "group",
    });
    addOfficeAddinQuestions(parent);
    chai.assert(parent.children?.length != undefined && parent.children.length > 0);
  });

  it("should show in scratch option when feature flag is on", () => {
    const officeAddinOption = ScratchOptionYesVSC();
    chai.assert.equal(
      officeAddinOption.label,
      `$(new-folder) ${getLocalizedString("core.ScratchOptionYesVSC.officeAddin.label")}`
    );
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
    const res = await validateAadManifestContainsPlaceholder(undefined, inputs);
    chai.assert.isUndefined(res);
  });
  it("validateAadManifestContainsPlaceholder skip", async () => {
    inputs[CoreQuestionNames.AadAppManifestFilePath] = "aadAppManifest";
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").resolves(Buffer.from("test"));
    const res = await validateAadManifestContainsPlaceholder(undefined, inputs);
    const expectRes = "Skip Current Question";
    chai.expect(res).to.equal(expectRes);
  });
  it("getQuestionsForCreateProjectWithoutDotNet for cli", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      [CoreQuestionNames.Folder]: os.tmpdir(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC().id,
      [CoreQuestionNames.Capabilities]: [TabSPFxItem().id],
      [CoreQuestionNames.ProgrammingLanguage]: "typescript",
    };

    const questions = await getQuestionsForCreateProjectV2(inputs);

    chai.expect(questions.isOk()).to.be.true;
    if (questions.isOk()) {
      chai.expect(questions.value?.children![0].children?.length).to.equal(3);
    }
  });
});
