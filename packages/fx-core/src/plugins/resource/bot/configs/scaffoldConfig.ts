// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from "../utils/common";
import { CommonStrings, PluginBot } from "../resources/strings";
import { isMultiEnvEnabled } from "../../../../common";
import { Inputs, PluginContext, v2, v3 } from "@microsoft/teamsfx-api";
import { ProgrammingLanguage } from "../enums/programmingLanguage";
import path from "path";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";

export class ScaffoldConfig {
  public botId?: string;
  public botPassword?: string;
  public objectId?: string;
  public programmingLanguage?: ProgrammingLanguage;
  public workingDir?: string;

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
    if (isMultiEnvEnabled()) {
      this.botId = context.envInfo.config.bot?.appId ?? this.botId;
      this.botPassword = context.envInfo.config.bot?.appPassword ?? this.botPassword;
    }

    const rawProgrammingLanguage = context.projectSettings?.programmingLanguage;
    if (
      rawProgrammingLanguage &&
      utils.existsInEnumValues(rawProgrammingLanguage, ProgrammingLanguage)
    ) {
      this.programmingLanguage = rawProgrammingLanguage as ProgrammingLanguage;
    }
  }

  public async restoreConfigFromContextV3(
    context: v2.Context,
    inputs: Inputs,
    envInfo?: v3.EnvInfoV3
  ): Promise<void> {
    this.workingDir = path.join(inputs.projectPath!, CommonStrings.BOT_WORKING_DIR_NAME);
    const botConfig = envInfo?.state[BuiltInFeaturePluginNames.bot] as v3.AzureBot;
    this.botId = botConfig?.botId;
    this.botPassword = botConfig?.botPassword;
    this.objectId = botConfig?.objectId;
    if (isMultiEnvEnabled()) {
      this.botId = envInfo?.config.bot?.appId ?? this.botId;
      this.botPassword = envInfo?.config.bot?.appPassword ?? this.botPassword;
    }

    const rawProgrammingLanguage = context.projectSetting.programmingLanguage;
    if (
      rawProgrammingLanguage &&
      utils.existsInEnumValues(rawProgrammingLanguage, ProgrammingLanguage)
    ) {
      this.programmingLanguage = rawProgrammingLanguage as ProgrammingLanguage;
    }
  }

  public saveConfigIntoContext(context: PluginContext): void {
    utils.checkAndSaveConfig(context, PluginBot.BOT_ID, this.botId);
    utils.checkAndSaveConfig(context, PluginBot.BOT_PASSWORD, this.botPassword);
    utils.checkAndSaveConfig(context, PluginBot.OBJECT_ID, this.objectId);
  }
}
