// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from "../utils/common";
import { CommonStrings, PluginBot } from "../resources/strings";
import { PluginContext } from "@microsoft/teamsfx-api";
import { ProgrammingLanguage } from "../enums/programmingLanguage";
import path from "path";
import { HostType } from "../enums/hostType";

export class ScaffoldConfig {
  public botId?: string;
  public botPassword?: string;
  public objectId?: string;
  public programmingLanguage?: ProgrammingLanguage;
  public workingDir?: string;
  public hostType?: HostType;

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
      this.programmingLanguage = rawProgrammingLanguage as ProgrammingLanguage;
    }

    const rawHostType =
      context.projectSettings?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[PluginBot.HOST_TYPE];
    if (rawHostType && utils.existsInEnumValues(rawHostType, HostType)) {
      this.hostType = rawHostType as HostType;
    }
  }

  public saveConfigIntoContext(context: PluginContext): void {
    utils.checkAndSaveConfig(context, PluginBot.BOT_ID, this.botId);
    utils.checkAndSaveConfig(context, PluginBot.BOT_PASSWORD, this.botPassword);
    utils.checkAndSaveConfig(context, PluginBot.OBJECT_ID, this.objectId);
    utils.checkAndSavePluginSetting(context, PluginBot.HOST_TYPE, this.hostType);
  }
}
