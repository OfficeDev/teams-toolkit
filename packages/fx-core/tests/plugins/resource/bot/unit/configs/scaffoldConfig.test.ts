// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import { ScaffoldConfig } from "../../../../../../src/plugins/resource/bot/configs/scaffoldConfig";
import * as testUtils from "../utils";
import { Stage, Json } from "@microsoft/teamsfx-api";
import {
  BotCapabilities,
  BotCapability,
  NotificationTriggers,
  PluginBot,
} from "../../../../../../src/plugins/resource/bot/resources/strings";
import { BotHostTypes } from "../../../../../../src/common/local/constants";
import { ResourcePlugins } from "../../../../../../src/common/constants";
import { QuestionNames } from "../../../../../../src/plugins/resource/bot/constants";
import {
  AppServiceOptionItem,
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
} from "../../../../../../src/plugins/resource/bot/question";
import {
  AzureSolutionQuestionNames,
  BotScenario,
} from "../../../../../../src/plugins/solution/fx-solution/question";
import { HostType } from "../../../../../../src/plugins/resource/bot/v2/enum";

describe("getBotHostType Tests", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("resolves to function host type when scaffolding", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [FunctionsHttpTriggerOptionItem.id];

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext, true);

    // Assert
    chai.assert.equal(hostType, HostType.Functions);
  });

  it("resolves to function host type when provisioning", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    const projectSettings = pluginContext.projectSettings!;
    projectSettings.pluginSettings = {
      [PluginBot.PLUGIN_NAME]: {
        [PluginBot.HOST_TYPE]: BotHostTypes.AzureFunctions,
      },
    };
    answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [AppServiceOptionItem.id];

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext, false);

    // Assert
    chai.assert.equal(hostType, HostType.Functions);
  });

  it("resolves to app service host type when scaffolding", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [AppServiceOptionItem.id];

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext, true);

    // Assert
    chai.assert.equal(hostType, HostType.AppService);
  });

  it("resolves to app service host type when provisioning", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    const projectSettings = pluginContext.projectSettings!;
    projectSettings.pluginSettings = {
      [PluginBot.PLUGIN_NAME]: {
        [PluginBot.HOST_TYPE]: BotHostTypes.AppService,
      },
    };
    answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [FunctionsHttpTriggerOptionItem.id];

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext, false);

    // Assert
    chai.assert.equal(hostType, HostType.AppService);
  });
});

describe("triggers Tests", () => {
  afterEach(() => sinon.restore());

  it("resolves triggers from HostTypeTrigger question", async () => {
    const cases: [string[], string[], string][] = [
      [[AppServiceOptionItem.id], [], "App Service no trigger"],
      [[FunctionsHttpTriggerOptionItem.id], [NotificationTriggers.HTTP], "Functions http trigger"],
      [
        [FunctionsTimerTriggerOptionItem.id],
        [NotificationTriggers.TIMER],
        "Functions timer trigger",
      ],
      [
        [FunctionsTimerTriggerOptionItem.id, FunctionsHttpTriggerOptionItem.id],
        [NotificationTriggers.HTTP, NotificationTriggers.TIMER],
        "Functions timer & http trigger",
      ],
    ];

    for (const c of cases) {
      const [answer, triggers, message] = c;
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      const answers = pluginContext.answers!;

      answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = answer;
      const scaffoldConfig = new ScaffoldConfig();

      // Act
      scaffoldConfig.restoreConfigFromContext(pluginContext, true);

      // Assert
      const result = [...scaffoldConfig.triggers].sort();
      const expected = [...new Set(triggers)].sort();

      chai.assert.deepEqual(result, expected, message);
    }
  });
});

describe("Plugin Settings: 'capabilities'", () => {
  // isScaffold, pluginSettings, answer["scenarios"], expected, message
  const cases: [boolean, Json, BotScenario[], BotCapability[], string][] = [
    [true, {}, [], [], "Scaffold legacy bot"],
    [
      true,
      {},
      [BotScenario.NotificationBot],
      [BotCapabilities.NOTIFICATION],
      "Scaffold notification bot",
    ],
    [
      true,
      {},
      [BotScenario.CommandAndResponseBot],
      [BotCapabilities.COMMAND_AND_RESPONSE],
      "Scaffold command and response bot",
    ],
    [
      true,
      {},
      [BotScenario.NotificationBot, BotScenario.CommandAndResponseBot],
      [BotCapabilities.NOTIFICATION, BotCapabilities.COMMAND_AND_RESPONSE],
      // Currently not supported end to end but tested for generality
      "Scaffold multiple capabilities",
    ],
    [false, {}, [], [], "Provision legacy bot"],
    [false, {}, [BotScenario.NotificationBot], [], "Provision legacy bot 2"],
    [
      false,
      {
        [ResourcePlugins.Bot]: {
          [PluginBot.BOT_CAPABILITIES]: [BotCapabilities.NOTIFICATION],
        },
      },
      // In reality this should be empty but this is a test case to make sure the result not use this.
      [BotScenario.CommandAndResponseBot],
      [BotCapabilities.NOTIFICATION],
      "Provision notification bot",
    ],
    [
      false,
      {
        [ResourcePlugins.Bot]: {
          [PluginBot.BOT_CAPABILITIES]: [
            BotCapabilities.NOTIFICATION,
            BotCapabilities.COMMAND_AND_RESPONSE,
          ],
        },
      },
      [],
      [BotCapabilities.NOTIFICATION, BotCapabilities.COMMAND_AND_RESPONSE],
      "Provision multiple capabilities",
    ],
  ];
  for (const [isScaffold, pluginSettings, scenarios, expectedList, message] of cases) {
    it(`Case '${message}'`, async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      const answers = pluginContext.answers!;
      const projectSettings = pluginContext.projectSettings!;

      answers[AzureSolutionQuestionNames.Scenarios] = scenarios;
      projectSettings.pluginSettings = pluginSettings;
      const scaffoldConfig = new ScaffoldConfig();

      // Act
      scaffoldConfig.restoreConfigFromContext(pluginContext, isScaffold);

      // Assert
      const result = [...(scaffoldConfig.botCapabilities || [])].sort();
      const expected = [...new Set(expectedList)].sort();

      chai.assert.deepEqual(result, expected, message);
    });
  }
});
