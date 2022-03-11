// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from "../utils/common";
import { PluginContext, Stage } from "@microsoft/teamsfx-api";
import {
  CommonStrings,
  HostType,
  HostTypes,
  NotificationTrigger,
  NotificationTriggers,
  PluginBot,
} from "../resources/strings";
import { ProgrammingLanguage } from "../enums/programmingLanguage";
import path from "path";
import { AzureSolutionQuestionNames } from "../../../solution/fx-solution/question";

export class ScaffoldConfig {
  public botId?: string;
  public botPassword?: string;
  public objectId?: string;
  public programmingLanguage?: ProgrammingLanguage;
  public workingDir?: string;
  public hostType?: HostType;
  public triggers: NotificationTrigger[] = [];

  public botAADCreated(): boolean {
    if (this.botId && this.botPassword) {
      return true;
    }
    return false;
  }

  public async restoreConfigFromContext(context: PluginContext): Promise<void> {
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

    this.hostType = ScaffoldConfig.getHostTypeFromProjectSettings(context);

    const rawTriggers = context.answers?.[AzureSolutionQuestionNames.BotNotificationTriggers];
    if (Array.isArray(rawTriggers)) {
      this.triggers = rawTriggers
        .map((rawTrigger: unknown): NotificationTrigger | undefined => {
          if (
            typeof rawTrigger === "string" &&
            utils.existsInEnumValues(rawTrigger, NotificationTriggers)
          ) {
            return rawTrigger;
          } else {
            return undefined;
          }
        })
        .filter((item) => item !== undefined) as NotificationTrigger[];
    }
  }

  public saveConfigIntoContext(context: PluginContext): void {
    utils.checkAndSaveConfig(context, PluginBot.BOT_ID, this.botId);
    utils.checkAndSaveConfig(context, PluginBot.BOT_PASSWORD, this.botPassword);
    utils.checkAndSaveConfig(context, PluginBot.OBJECT_ID, this.objectId);
    utils.checkAndSavePluginSetting(context, PluginBot.HOST_TYPE, this.hostType);
  }

  /**
   * Get bot host type from plugin context.
   * For stages like scaffolding, the host type is from user inputs of question model (i.e. context.answers).
   * For later stages, the host type is persisted in projectSettings.json.
   */
  public static getBotHostType(context: PluginContext): HostType | undefined {
    // TODO: support other stages (maybe addCapability)
    const fromInputs = context.answers?.stage === Stage.create;
    if (fromInputs) {
      // TODO: retrieve host type from context.answers
      // Since the UI design is not finalized yet,
      // for testing purpose we currently use an environment variable to select hostType.
      // Change the logic after question model is implemented.
      if (process.env.TEAMSFX_BOT_HOST_TYPE) {
        return process.env.TEAMSFX_BOT_HOST_TYPE === "function"
          ? HostTypes.AZURE_FUNCTIONS
          : HostTypes.APP_SERVICE;
      } else {
        return undefined;
      }
    } else {
      return this.getHostTypeFromProjectSettings(context);
    }
  }

  private static getHostTypeFromProjectSettings(context: PluginContext): HostType | undefined {
    const rawHostType = context.projectSettings?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
      PluginBot.HOST_TYPE
    ] as string;
    return utils.convertToConstValues(rawHostType, HostTypes);
  }
}
