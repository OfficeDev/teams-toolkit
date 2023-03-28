import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import {
  createCapabilityQuestion,
  createCapabilityQuestionPreview,
  createAppNameQuestion,
  handleSelectionConflict,
  ProgrammingLanguageQuestion,
  ScratchOptionYesVSC,
  CoreQuestionNames,
  getQuestionForDeployAadManifest,
  validateAadManifestContainsPlaceholder,
} from "../../src/core/question";
import { FuncValidation, Inputs, Platform, QTreeNode, v2, ok, err } from "@microsoft/teamsfx-api";
import {
  BotNewUIOptionItem,
  BotOptionItem,
  CommandAndResponseOptionItem,
  DashboardOptionItem,
  ExistingTabOptionItem,
  M365SearchAppOptionItem,
  M365SsoLaunchPageOptionItem,
  MessageExtensionItem,
  MessageExtensionNewUIItem,
  NotificationOptionItem,
  TabNewUIOptionItem,
  TabNonSsoItem,
  TabOptionItem,
  TabSPFxItem,
  TabSPFxNewUIItem,
  WorkflowOptionItem,
} from "../../src/component/constants";
import { getLocalizedString } from "../../src/common/localizeUtils";
import { addOfficeAddinQuestions } from "../../src/core/middleware/questionModel";
import * as featureFlags from "../../src/common/featureFlags";
import os from "os";
import { MockTools, randomAppName } from "./utils";
import { environmentManager } from "../../src/core/environment";
import path from "path";
import * as fs from "fs-extra";
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

describe("handleSelectionConflicts", () => {
  it("supports valid cases", async () => {
    // Arrange
    // [sets, previous, current, expected]
    const cases: [string[][], string[], string[], string[]][] = [
      // zero set
      [[], [], [], []],
      [[], [], ["a"], ["a"]],
      [[], ["a"], ["a", "b"], ["a", "b"]],

      // one set
      [[["a", "b"]], ["a"], ["a", "b"], ["a", "b"]],
      [[["a", "b"]], ["a"], ["a"], ["a"]],
      [[["a", "b"]], ["a"], ["a", "b"], ["a", "b"]],
      [[["a", "b"]], ["b"], ["a", "b"], ["a", "b"]],
      [[["a", "b"]], ["b"], [], []],

      // two sets
      // "a" and "b" conflict
      [[["a"], ["b"]], [], ["b"], ["b"]],
      [[["a"], ["b"]], ["a"], ["a", "b"], ["b"]],
      [[["a"], ["b"]], ["b"], [""], [""]],
      [[["a"], ["b"]], ["b"], ["b"], ["b"]],

      // "a" and "b","c" conflict
      [[["a"], ["b", "c"]], ["a"], ["a", "b"], ["b"]],
      [[["a"], ["b", "c"]], ["b"], ["b", "c"], ["b", "c"]],
      [[["a"], ["b", "c"]], ["b", "c"], ["b", "c", "a"], ["a"]],

      // "a","b" and "c","d" conflict
      [
        [
          ["a", "b"],
          ["c", "d"],
        ],
        ["a"],
        ["a", "b"],
        ["a", "b"],
      ],
      [
        [
          ["a", "b"],
          ["c", "d"],
        ],
        ["a", "b"],
        ["a", "b", "c"],
        ["c"],
      ],

      // multiple sets
      [[["a", "b"], ["c"], ["d"]], ["a"], ["a", "c"], ["c"]],
      [[["a", "b"], ["c"], ["d"]], ["a", "b"], ["a", "b", "c"], ["c"]],
      [
        [["a", "b"], ["c"], ["d"]],
        ["a", "b", "x"],
        ["a", "b", "c", "x"],
        ["c", "x"],
      ],
      [[["a", "b"], ["c"], ["d"]], ["c"], ["a", "b", "c"], ["a", "b"]],
    ];

    for (const c of cases) {
      const [arrs, previous, current, expectedList] = c;
      // Act
      const sets = [...arrs.map((item) => new Set<string>(item))];
      const resultSet = handleSelectionConflict(sets, new Set(previous), new Set(current));

      // Assert
      const result = [...resultSet].sort();
      const expected = expectedList.sort();
      const message = `handleSelectionConflict test case failed: '${JSON.stringify(c)}'`;
      chai.assert.deepEqual(result, expected, message);
    }
  });
});

describe("Capability Questions", () => {
  describe("Notification related", () => {
    beforeEach(() => {
      sinon.restore();
      sinon.stub(process, "env").value({
        BOT_NOTIFICATION_ENABLED: "true",
      });
    });

    it("notification validation", async () => {
      const cases: [string[], boolean][] = [
        [[], false],
        [[NotificationOptionItem().id], true],
        [[NotificationOptionItem().id, BotOptionItem().id], false],
        [[NotificationOptionItem().id, MessageExtensionItem().id], false],
        [[BotOptionItem().id, MessageExtensionItem().id], true],
        [[NotificationOptionItem().id, TabOptionItem().id], true],
        [[NotificationOptionItem().id, TabSPFxItem().id], false],
        [[NotificationOptionItem().id, TabOptionItem().id, BotOptionItem().id], false],
      ];

      // Arrange
      const question = createCapabilityQuestion();
      const validFunc = (question.validation as FuncValidation<string[]>).validFunc;

      for (const c of cases) {
        const [input, expected] = c;
        // Act
        const result = await validFunc(input);
        const message = `notification validation test case failed: '${JSON.stringify(
          c
        )}', result: '${result}'`;

        // Assert
        chai.assert.equal(result === undefined, expected, message);
      }
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
        TabNewUIOptionItem(),
        TabSPFxNewUIItem(),
        TabNonSsoItem(),
        BotNewUIOptionItem(),
        MessageExtensionNewUIItem(),
        M365SsoLaunchPageOptionItem(),
        M365SearchAppOptionItem(),
      ]);
    });
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
    sinon.stub(featureFlags, "isOfficeAddinEnabled").returns(true);

    const officeAddinOption = ScratchOptionYesVSC();
    chai.assert.equal(
      officeAddinOption.label,
      `$(new-folder) ${getLocalizedString("core.ScratchOptionYesVSC.officeAddin.label")}`
    );
  });

  it("should not show in scratch option when feature flag is off", () => {
    sinon.stub(featureFlags, "isOfficeAddinEnabled").returns(false);
    const originOption = ScratchOptionYesVSC();
    chai.assert.equal(
      originOption.label,
      `$(new-folder) ${getLocalizedString("core.ScratchOptionYesVSC.label")}`
    );
  });
});

describe("updateAadManifestQeustion()", async () => {
  const inputs: v2.InputsWithProjectPath = {
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
});
