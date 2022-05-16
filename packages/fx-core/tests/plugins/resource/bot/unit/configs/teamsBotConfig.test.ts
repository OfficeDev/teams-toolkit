// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import { TeamsBotConfig } from "../../../../../../src/plugins/resource/bot/configs/teamsBotConfig";
import * as testUtils from "../utils";
import { QuestionNames } from "../../../../../../src/plugins/resource/bot/constants";
import { PluginActRoles } from "../../../../../../src/plugins/resource/bot/enums/pluginActRoles";
import {
  BotOptionItem,
  AzureSolutionQuestionNames,
} from "../../../../../../src/plugins/solution/fx-solution/question";

describe("TeamsBotConfig Tests", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it("test regression bug for legacy bot: 'act roles is missing.'", async () => {
    // TODO: remove case after removing isBotNotificationEnabled()
    // legacy bot scaffolding should not make actRoles empty

    // Arrange
    sinon.stub(process, "env").value({ BOT_NOTIFICATION_ENABLED: "false" });
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    answers[QuestionNames.CAPABILITIES] = [BotOptionItem.id];

    // Act
    const config = new TeamsBotConfig();
    await config.restoreConfigFromContext(pluginContext, true);

    // Assert
    chai.assert.deepEqual(config.actRoles, [PluginActRoles.Bot]);
  });

  it("test regression bug for legacy bot with GA features: 'act roles is missing.'", async () => {
    // For GA, legacy bot is also supported, so also test with feature flags enabled.
    // legacy bot scaffolding should not make actRoles empty

    // Arrange
    sinon.stub(process, "env").value({ BOT_NOTIFICATION_ENABLED: "true" });
    const pluginContext = testUtils.newPluginContext();
    const answers = pluginContext.answers!;
    answers[QuestionNames.CAPABILITIES] = [BotOptionItem.id];
    answers[AzureSolutionQuestionNames.Scenarios] = [];

    // Act
    const config = new TeamsBotConfig();
    await config.restoreConfigFromContext(pluginContext, true);

    // Assert
    chai.assert.deepEqual(config.actRoles, [PluginActRoles.Bot]);
  });
});
