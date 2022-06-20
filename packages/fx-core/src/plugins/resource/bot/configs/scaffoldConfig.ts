// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from "../utils/common";
import { Inputs, PluginContext, Stage } from "@microsoft/teamsfx-api";
import {
  BotCapabilities,
  BotCapability,
  CommonStrings,
  NotificationTrigger,
  PluginBot,
  QuestionBotScenarioToBotCapability,
} from "../resources/strings";
import { ProgrammingLanguage } from "../enums/programmingLanguage";
import path from "path";
import { QuestionNames } from "../constants";
import { FunctionsOptionItems } from "../question";
import { AzureSolutionQuestionNames } from "../../../solution/fx-solution/question";
import { HostType } from "../v2/enum";

export class ScaffoldConfig {
  public botId?: string;
  public botPassword?: string;
  public objectId?: string;
  public programmingLanguage?: ProgrammingLanguage;
  public workingDir?: string;
  public hostType?: HostType;
  public triggers: NotificationTrigger[] = [];
  // empty array for legacy bot
  public botCapabilities: BotCapability[] = [];

  public botAADCreated(): boolean {
    if (this.botId && this.botPassword) {
      return true;
    }
    return false;
  }

  public async restoreConfigFromContext(
    context: PluginContext,
    isScaffold: boolean
  ): Promise<void> {
    this.workingDir = path.join(context.root, CommonStrings.BOT_WORKING_DIR_NAME);
    this.botId = context.config.get(PluginBot.BOT_ID) as string;
    this.botPassword = context.config.get(PluginBot.BOT_PASSWORD) as string;
    this.objectId = context.config.get(PluginBot.OBJECT_ID) as string;
    this.botId = context.envInfo.config.bot?.appId ?? this.botId;
    this.botPassword = context.envInfo.config.bot?.appPassword ?? this.botPassword;

    const rawProgrammingLanguage = context.projectSettings?.programmingLanguage;
    if (
      rawProgrammingLanguage &&
      utils.existsInEnumValues(rawProgrammingLanguage, ProgrammingLanguage)
    ) {
      this.programmingLanguage = rawProgrammingLanguage;
    }

    this.botCapabilities = ScaffoldConfig.getBotCapabilities(context, isScaffold);

    this.hostType = ScaffoldConfig.getHostTypeFromProjectSettings(context);

    const rawHostTypeTriggers = context.answers?.[QuestionNames.BOT_HOST_TYPE_TRIGGER];
    if (Array.isArray(rawHostTypeTriggers)) {
      // convert HostTypeTrigger question to trigger name
      this.triggers = rawHostTypeTriggers
        .map((hostTypeTrigger) => {
          const option = FunctionsOptionItems.find((option) => option.id === hostTypeTrigger);
          return option?.trigger;
        })
        .filter((item): item is NotificationTrigger => item !== undefined);
    }
  }

  public saveConfigIntoContext(context: PluginContext): void {
    utils.checkAndSaveConfig(context, PluginBot.BOT_ID, this.botId);
    utils.checkAndSaveConfig(context, PluginBot.BOT_PASSWORD, this.botPassword);
    utils.checkAndSaveConfig(context, PluginBot.OBJECT_ID, this.objectId);
    utils.checkAndSavePluginSetting(context, PluginBot.HOST_TYPE, this.hostType);
    utils.checkAndSavePluginSetting(context, PluginBot.BOT_CAPABILITIES, this.botCapabilities);
  }

  /**
   * Get bot host type from plugin context.
   * For stages like scaffolding (including create new and add capability),
   *    the host type is from user inputs of question model (i.e. context.answers).
   * For later stages, the host type is persisted in projectSettings.json.
   * @param isScaffold true for the `scaffold` lifecycle, false otherwise.
   */
  public static getBotHostType(context: PluginContext, isScaffold: boolean): HostType | undefined {
    if (isScaffold) {
      return context.answers
        ? this.getHostTypeFromHostTypeTriggerQuestion(context.answers)
        : undefined;
    } else {
      return this.getHostTypeFromProjectSettings(context);
    }
  }

  private static getHostTypeFromHostTypeTriggerQuestion(answers: Inputs): HostType {
    // intersection of hostTypeTriggers and HostTypeTriggerOptions
    const hostTypeTriggers = answers[QuestionNames.BOT_HOST_TYPE_TRIGGER];
    if (Array.isArray(hostTypeTriggers)) {
      return FunctionsOptionItems.some((item) => hostTypeTriggers.includes(item.id))
        ? HostType.Functions
        : HostType.AppService;
    }
    return HostType.AppService;
  }

  private static getHostTypeFromProjectSettings(context: PluginContext): HostType | undefined {
    const rawHostType = context.projectSettings?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
      PluginBot.HOST_TYPE
    ] as string;
    return Object.values(HostType).find((itemValue: string) => rawHostType === itemValue);
  }

  private static getBotCapabilities(context: PluginContext, isScaffold: boolean): BotCapability[] {
    if (isScaffold) {
      // For scaffolding and addCapability, the bot capabilities are from user input (context.answers)
      const scenarios = context.answers?.[AzureSolutionQuestionNames.Scenarios];
      if (Array.isArray(scenarios)) {
        return scenarios
          .map((item) => QuestionBotScenarioToBotCapability.get(item))
          .filter((item): item is BotCapability => item !== undefined);
      } else {
        // for legacy bot
        return [];
      }
    } else {
      // For other lifecycles, from pluginSettings.json
      const rawBotCapabilities =
        context.projectSettings?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
          PluginBot.BOT_CAPABILITIES
        ];
      if (Array.isArray(rawBotCapabilities)) {
        return rawBotCapabilities
          .map((botCapability) => utils.convertToConstValues(botCapability, BotCapabilities))
          .filter((item): item is BotCapability => item != undefined);
      } else {
        // for legacy bot
        return [];
      }
    }
  }
}
