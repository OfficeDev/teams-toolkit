// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import { ScaffoldConfig } from "../../../../../../src/plugins/resource/bot/configs/scaffoldConfig";
import * as testUtils from "../utils";
import { Stage } from "@microsoft/teamsfx-api";
import { HostTypes, PluginBot } from "../../../../../../src/plugins/resource/bot/resources/strings";
import { BotHostTypes } from "../../../../../../src/common/local/constants";

describe("getBotHostType Tests", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("resolves to function host type when scaffolding", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    pluginContext.answers!.stage = Stage.create;
    sinon.stub(process, "env").value({ TEAMSFX_BOT_HOST_TYPE: "function" });

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext);

    // Assert
    chai.assert.equal(hostType, HostTypes.AZURE_FUNCTIONS);
  });

  it("resolves to function host type when provisioning", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    pluginContext.answers!.stage = Stage.provision;
    pluginContext.projectSettings!.pluginSettings = {
      [PluginBot.PLUGIN_NAME]: {
        [PluginBot.HOST_TYPE]: BotHostTypes.AzureFunctions,
      },
    };
    sinon.stub(process, "env").value({ TEAMSFX_BOT_HOST_TYPE: "appService" });

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext);

    // Assert
    chai.assert.equal(hostType, HostTypes.AZURE_FUNCTIONS);
  });

  it("resolves to app service host type when scaffolding", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    pluginContext.answers!.stage = Stage.create;
    sinon.stub(process, "env").value({ TEAMSFX_BOT_HOST_TYPE: "appService" });

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext);

    // Assert
    chai.assert.equal(hostType, HostTypes.APP_SERVICE);
  });

  it("resolves to app service host type when provisioning", async () => {
    // Arrange
    const pluginContext = testUtils.newPluginContext();
    pluginContext.answers!.stage = Stage.provision;
    pluginContext.projectSettings!.pluginSettings = {
      [PluginBot.PLUGIN_NAME]: {
        [PluginBot.HOST_TYPE]: BotHostTypes.AppService,
      },
    };
    sinon.stub(process, "env").value({ TEAMSFX_BOT_HOST_TYPE: "functioin" });

    // Act
    const hostType = ScaffoldConfig.getBotHostType(pluginContext);

    // Assert
    chai.assert.equal(hostType, HostTypes.APP_SERVICE);
  });
});
