import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import {
  createCapabilityQuestion,
  createCapabilityQuestionPreview,
  createAppNameQuestion,
  handleSelectionConflict,
  ProgrammingLanguageQuestion,
} from "../../src/core/question";
import { FuncValidation, Inputs, Platform } from "@microsoft/teamsfx-api";
import {
  BotNewUIOptionItem,
  BotOptionItem,
  CommandAndResponseOptionItem,
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
} from "../../src/plugins/solution/fx-solution/question";
import { getLocalizedString } from "../../src/common/localizeUtils";

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
        [[NotificationOptionItem.id], true],
        [[NotificationOptionItem.id, BotOptionItem.id], false],
        [[NotificationOptionItem.id, MessageExtensionItem.id], false],
        [[BotOptionItem.id, MessageExtensionItem.id], true],
        [[NotificationOptionItem.id, TabOptionItem.id], true],
        [[NotificationOptionItem.id, TabSPFxItem.id], false],
        [[NotificationOptionItem.id, TabOptionItem.id, BotOptionItem.id], false],
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
    it("should return single select question", () => {
      // Act
      const question = createCapabilityQuestionPreview();
      // Assert
      chai.assert.equal(question.type, "singleSelect");
      chai.assert.equal(question.name, "capabilities");
      chai.assert.deepEqual(question.staticOptions, [
        NotificationOptionItem,
        CommandAndResponseOptionItem,
        TabNewUIOptionItem,
        TabSPFxNewUIItem,
        TabNonSsoItem,
        BotNewUIOptionItem,
        MessageExtensionNewUIItem,
        M365SsoLaunchPageOptionItem,
        M365SearchAppOptionItem,
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
});
