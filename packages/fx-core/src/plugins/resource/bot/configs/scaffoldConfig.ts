// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from "../utils/common";
import { CommonStrings, PluginBot, PluginSolution } from "../resources/strings";
import { ConfigValue, PluginContext } from "@microsoft/teamsfx-api";
import { ProgrammingLanguage } from "../enums/programmingLanguage";
import { WayToRegisterBot } from "../enums/wayToRegisterBot";
import path from "path";

export class ScaffoldConfig {
  public botId?: string;
  public botPassword?: string;
  public objectId?: string;
  public programmingLanguage?: ProgrammingLanguage;
  public wayToRegisterBot?: WayToRegisterBot;
  public workingDir?: string;

  public botRegistrationCreated(): boolean {
    if (this.botId && this.botPassword && this.objectId) {
      return true;
    }

    return false;
  }

  public async restoreConfigFromContext(context: PluginContext): Promise<void> {
    this.workingDir = path.join(context.root, CommonStrings.BOT_WORKING_DIR_NAME);

    this.botId = context.config.get(PluginBot.BOT_ID) as string;

    this.botPassword = context.config.get(PluginBot.BOT_PASSWORD) as string;

    this.objectId = context.config.get(PluginBot.OBJECT_ID) as string;

    const rawProgrammingLanguage = context.projectSettings?.programmingLanguage;

    if (
      rawProgrammingLanguage &&
      utils.existsInEnumValues(rawProgrammingLanguage, ProgrammingLanguage)
    ) {
      this.programmingLanguage = rawProgrammingLanguage as ProgrammingLanguage;
    }

    const rawWay = context.config.get(PluginBot.WAY_TO_REGISTER_BOT) as string;
    if (rawWay && utils.existsInEnumValues(rawWay, WayToRegisterBot)) {
      this.wayToRegisterBot = rawWay as WayToRegisterBot;
    }
  }

  public saveConfigIntoContext(context: PluginContext): void {
    utils.checkAndSaveConfig(context, PluginBot.BOT_ID, this.botId);
    utils.checkAndSaveConfig(context, PluginBot.BOT_PASSWORD, this.botPassword);
    utils.checkAndSaveConfig(context, PluginBot.OBJECT_ID, this.objectId);
    utils.checkAndSaveConfig(context, PluginBot.PROGRAMMING_LANGUAGE, this.programmingLanguage);
    utils.checkAndSaveConfig(context, PluginBot.WAY_TO_REGISTER_BOT, this.wayToRegisterBot);
  }
}
