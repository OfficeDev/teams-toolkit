// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import mock from "mock-fs";
import * as path from "path";

import { LanguageStrategy } from "../../../../../src/plugins/resource/bot/languageStrategy";
import { ProgrammingLanguage } from "../../../../../src/plugins/resource/bot/enums/programmingLanguage";
import {
  TemplateProjectsConstants,
  TemplateProjectsScenarios,
  TriggerTemplateScenarioMappings,
} from "../../../../../src/plugins/resource/bot/constants";
import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { Messages } from "./messages";
import { PluginError } from "../../../../../src/plugins/resource/bot/errors";
import { getTemplatesFolder } from "../../../../../../fx-core/src";
import AdmZip from "adm-zip";
import { TeamsBotConfig } from "../../../../../src/plugins/resource/bot/configs/teamsBotConfig";
import {
  fetchTemplateZipFromLocalAction,
  ScaffoldContext,
  unzipAction,
} from "../../../../../src/common/template-utils/templatesActions";
import { PluginActRoles } from "../../../../../src/plugins/resource/bot/enums/pluginActRoles";
import { NotificationTriggers } from "../../../../../src/plugins/resource/bot/resources/strings";
import { BotNotificationTriggers } from "../../../../../src/plugins/solution/fx-solution/question";
import { HostType } from "../../../../../src/plugins/resource/bot/v2/enum";

describe("Language Strategy", () => {
  describe("getTemplateProject", () => {
    const botConfig = {
      scaffold: { programmingLanguage: ProgrammingLanguage.JavaScript, workingDir: __dirname },
      actRoles: [PluginActRoles.Bot],
    } as TeamsBotConfig;
    before(() => {
      const commonPath = path.join(getTemplatesFolder(), "fallback");
      const botJsPath = path.join(
        commonPath,
        `${TemplateProjectsConstants.GROUP_NAME_BOT}.${utils.convertToLangKey(
          ProgrammingLanguage.JavaScript
        )}.${TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME}.zip`
      );

      const config: { [key: string]: any } = {};
      config[botJsPath] = new AdmZip().toBuffer();
      mock(config);
    });

    after(() => {
      mock.restore();
    });

    it("Fetch From Public Url", async () => {
      // Arrange
      try {
        const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;

        // Act
        await LanguageStrategy.scaffoldProject(group_name, botConfig);
      } catch (e) {
        // Assert
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });

    it("Fetch From Local", async () => {
      try {
        // Arrange
        const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;

        // Act
        await LanguageStrategy.scaffoldProject(group_name, botConfig, [
          fetchTemplateZipFromLocalAction,
          unzipAction,
        ]);
      } catch (e) {
        // Assert
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });
  });

  function createBotConfig(dirName: string, actRoles: PluginActRoles, hostType?: HostType) {
    return {
      scaffold: {
        programmingLanguage: ProgrammingLanguage.TypeScript,
        workingDir: dirName,
        hostType: hostType,
      },
      actRoles: [actRoles],
    } as TeamsBotConfig;
  }

  describe("Scaffold templates for different types of project", () => {
    let scaffoldContext: ScaffoldContext;
    const botDir = "some-dir";
    const mockScaffoldAction = {
      name: "mockScaffoldAction",
      run: async (context: ScaffoldContext): Promise<void> => {
        scaffoldContext = context;
      },
    };
    before(() => {
      const commonPath = path.join(getTemplatesFolder(), "plugins", "resource", "bot");
      const botJsPath = path.join(
        commonPath,
        `${TemplateProjectsConstants.GROUP_NAME_BOT}.${utils.convertToLangKey(
          ProgrammingLanguage.JavaScript
        )}.${TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME}.zip`
      );

      const config: { [key: string]: any } = {};
      config[botJsPath] = new AdmZip().toBuffer();
      mock(config);
    });

    after(() => {
      mock.restore();
    });

    it("Fetch Legacy Bot", async () => {
      // Arrange
      const botConfig = createBotConfig(botDir, PluginActRoles.Bot);
      const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;

      // Act
      await LanguageStrategy.scaffoldProject(group_name, botConfig, [mockScaffoldAction]);

      // Assert
      chai.assert.equal(scaffoldContext.group, group_name);
      chai.assert.equal(scaffoldContext.lang, "ts");
      chai.assert.equal(scaffoldContext.scenario, "default");
    });

    it("Fetch Notification with App Service hosting", async () => {
      // Arrange
      const botConfig = createBotConfig(botDir, PluginActRoles.Notification, HostType.AppService);
      const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;

      // Act
      await LanguageStrategy.scaffoldProject(group_name, botConfig, [mockScaffoldAction]);

      // Assert
      chai.assert.equal(scaffoldContext.group, group_name);
      chai.assert.equal(scaffoldContext.lang, "ts");
      chai.assert.equal(
        scaffoldContext.scenario,
        TemplateProjectsScenarios.NOTIFICATION_RESTIFY_SCENARIO_NAME
      );
    });

    it("Fetch Notification with Functions hosting", async () => {
      // Arrange
      const botConfig = createBotConfig(botDir, PluginActRoles.Notification, HostType.Functions);
      const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;

      // Act
      await LanguageStrategy.scaffoldProject(group_name, botConfig, [mockScaffoldAction]);

      // Assert
      chai.assert.equal(scaffoldContext.group, group_name);
      chai.assert.equal(scaffoldContext.lang, "ts");
      chai.assert.equal(
        scaffoldContext.scenario,
        TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME
      );
    });
  });

  describe("Scaffold templates for different triggers of Functions", () => {
    let scaffoldContexts: ScaffoldContext[];
    const mockScaffoldAction = {
      name: "mockScaffoldAction",
      run: async (context: ScaffoldContext): Promise<void> => {
        scaffoldContexts.push(context);
      },
    };
    before(() => {
      scaffoldContexts = [];
      const commonPath = path.join(getTemplatesFolder(), "plugins", "resource", "bot");
      const botJsPath = path.join(
        commonPath,
        `${TemplateProjectsConstants.GROUP_NAME_BOT}.${utils.convertToLangKey(
          ProgrammingLanguage.JavaScript
        )}.${TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME}.zip`
      );

      const config: { [key: string]: any } = {};
      config[botJsPath] = new AdmZip().toBuffer();
      mock(config);
    });

    after(() => {
      mock.restore();
    });

    it("Fetch notification triggers", async () => {
      const botDir = "some-dir";
      // Arrange
      const botConfig = createBotConfig(botDir, PluginActRoles.Notification, HostType.Functions);
      const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
      botConfig.scaffold.triggers = [NotificationTriggers.HTTP];

      // Act
      await LanguageStrategy.scaffoldTriggers(group_name, botConfig, [mockScaffoldAction]);

      // Assert
      chai.assert.equal(scaffoldContexts.length, 1);
      chai.assert.equal(scaffoldContexts[0].group, group_name);
      chai.assert.equal(scaffoldContexts[0].lang, "ts");
      chai.assert.equal(
        scaffoldContexts[0].scenario,
        TriggerTemplateScenarioMappings[BotNotificationTriggers.Http]
      );
      chai.assert.isTrue(scaffoldContexts[0].dst !== undefined);
      chai.assert.equal(
        path.normalize(scaffoldContexts[0].dst as string),
        path.normalize(path.join(botDir))
      );
    });
  });

  describe("localBuild", () => {
    it("TypeScript Invalid PackDir", async () => {
      // Arrange
      const lang = ProgrammingLanguage.TypeScript;
      const packDir = "anything";

      // Act
      try {
        await LanguageStrategy.localBuild(lang, packDir);
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });

    it("JavaScript Invalid PackDir", async () => {
      // Arrange
      const lang = ProgrammingLanguage.JavaScript;
      const packDir = "anything";

      // Act
      try {
        await LanguageStrategy.localBuild(lang, packDir);
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });
});
