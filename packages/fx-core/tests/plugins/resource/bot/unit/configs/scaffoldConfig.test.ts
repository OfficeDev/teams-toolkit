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
  HostTypes,
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

describe("getBotHostType Tests", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("resolves to function host type when scaffolding", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    answers.stage = Stage.create;
    answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [FunctionsHttpTriggerOptionItem.id];

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext);

    // Assert
    chai.assert.equal(hostType, HostTypes.AZURE_FUNCTIONS);
  });

  it("resolves to function host type when provisioning", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    const projectSettings = pluginContext.projectSettings!;
    answers.stage = Stage.provision;
    projectSettings.pluginSettings = {
      [PluginBot.PLUGIN_NAME]: {
        [PluginBot.HOST_TYPE]: BotHostTypes.AzureFunctions,
      },
    };
    answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [AppServiceOptionItem.id];

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext);

    // Assert
    chai.assert.equal(hostType, HostTypes.AZURE_FUNCTIONS);
  });

  it("resolves to app service host type when scaffolding", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    answers.stage = Stage.create;
    answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [AppServiceOptionItem.id];

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext);

    // Assert
    chai.assert.equal(hostType, HostTypes.APP_SERVICE);
  });

  it("resolves to app service host type when provisioning", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    const projectSettings = pluginContext.projectSettings!;
    answers.stage = Stage.provision;
    projectSettings.pluginSettings = {
      [PluginBot.PLUGIN_NAME]: {
        [PluginBot.HOST_TYPE]: BotHostTypes.AppService,
      },
    };
    answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = [FunctionsHttpTriggerOptionItem.id];

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext);

    // Assert
    chai.assert.equal(hostType, HostTypes.APP_SERVICE);
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

      answers.stage = Stage.create;
      answers[QuestionNames.BOT_HOST_TYPE_TRIGGER] = answer;
      const scaffoldConfig = new ScaffoldConfig();

      // Act
      scaffoldConfig.restoreConfigFromContext(pluginContext);

      // Assert
      const result = [...scaffoldConfig.triggers].sort();
      const expected = [...new Set(triggers)].sort();

      chai.assert.deepEqual(result, expected, message);
    }
  });
});

describe("Plugin Settings: 'capabilities'", () => {
  // stage, pluginSettings, answer["scenarios"], expected, message
  const cases: [Stage, Json, BotScenario[], BotCapability[], string][] = [
    [Stage.create, {}, [], [], "Scaffold legacy bot"],
    [
      Stage.create,
      {},
      [BotScenario.NotificationBot],
      [BotCapabilities.NOTIFICATION],
      "Scaffold notification bot",
    ],
    [
      Stage.create,
      {},
      [BotScenario.CommandAndResponseBot],
      [BotCapabilities.COMMAND_AND_RESPONSE],
      "Scaffold command and response bot",
    ],
    [
      Stage.create,
      {},
      [BotScenario.NotificationBot, BotScenario.CommandAndResponseBot],
      [BotCapabilities.NOTIFICATION, BotCapabilities.COMMAND_AND_RESPONSE],
      // Currently not supported end to end but tested for generality
      "Scaffold multiple capabilities",
    ],
    [Stage.provision, {}, [], [], "Provision legacy bot"],
    [Stage.provision, {}, [BotScenario.NotificationBot], [], "Provision legacy bot 2"],
    [
      Stage.provision,
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
      Stage.provision,
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
  for (const [stage, pluginSettings, scenarios, expectedList, message] of cases) {
    it(`Case '${message}'`, async () => {
      // Arrange
      const pluginContext = testUtils.newPluginContext();
      const answers = pluginContext.answers!;
      const projectSettings = pluginContext.projectSettings!;

      answers.stage = stage;
      answers[AzureSolutionQuestionNames.Scenarios] = scenarios;
      projectSettings.pluginSettings = pluginSettings;
      const scaffoldConfig = new ScaffoldConfig();

      // Act
      scaffoldConfig.restoreConfigFromContext(pluginContext);

      // Assert
      const result = [...(scaffoldConfig.botCapabilities || [])].sort();
      const expected = [...new Set(expectedList)].sort();

      chai.assert.deepEqual(result, expected, message);
    });
  }
});
