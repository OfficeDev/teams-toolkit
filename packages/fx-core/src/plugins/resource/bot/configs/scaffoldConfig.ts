// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from "../utils/common";
import { CommonStrings, PluginBot } from "../resources/strings";
import { ConfigValue, PluginContext } from "fx-api";
import { ProgrammingLanguage } from "../enums/programmingLanguage";
import { WayToRegisterBot } from "../enums/wayToRegisterBot";

export class ScaffoldConfig {
    public botId?: string;
    public botPassword?: string;
    public programmingLanguage?: ProgrammingLanguage;
    public wayToRegisterBot?: WayToRegisterBot;
    public workingDir?: string;
    public scaffolded = false;

    public async restoreConfigFromContext(context: PluginContext): Promise<void> {

        this.workingDir = `${context.root}/${CommonStrings.BOT_WORKING_DIR_NAME}`;

        const botIdValue: ConfigValue = context.config.get(PluginBot.BOT_ID);
        if (botIdValue) {
            this.botId = botIdValue as string;
        }

        const botPasswordValue: ConfigValue = context.config.get(PluginBot.BOT_PASSWORD);
        if (botPasswordValue) {
            this.botPassword = botPasswordValue as string;
        }

        let rawProgrammingLanguage = "";
        const programmingLanguageValue: ConfigValue = context.config.get(PluginBot.PROGRAMMING_LANGUAGE);
        if (programmingLanguageValue) {
            rawProgrammingLanguage = programmingLanguageValue as string;
        }

        if (rawProgrammingLanguage && utils.existsInEnumValues(rawProgrammingLanguage, ProgrammingLanguage)) {
            this.programmingLanguage = rawProgrammingLanguage as ProgrammingLanguage;
        }

        let rawWay = "";
        const wayValue: ConfigValue = context.config.get(PluginBot.WAY_TO_REGISTER_BOT);
        if (wayValue) {
            rawWay = wayValue as string;
        }

        if (rawWay && utils.existsInEnumValues(rawWay, WayToRegisterBot)) {
            this.wayToRegisterBot = rawWay as WayToRegisterBot;
        }

        const scaffoldedValue: ConfigValue = context.config.get(PluginBot.SCAFFOLDED);
        if (scaffoldedValue) {
            this.scaffolded = (scaffoldedValue as string) === "true";
        }
    }

    public saveConfigIntoContext(context: PluginContext): void {
        utils.checkAndSaveConfig(context, PluginBot.BOT_ID, this.botId);
        utils.checkAndSaveConfig(context, PluginBot.BOT_PASSWORD, this.botPassword);
        utils.checkAndSaveConfig(context, PluginBot.PROGRAMMING_LANGUAGE, this.programmingLanguage);
        utils.checkAndSaveConfig(context, PluginBot.WAY_TO_REGISTER_BOT, this.wayToRegisterBot);
        utils.checkAndSaveConfig(context, PluginBot.SCAFFOLDED, this.scaffolded ? "true" : "false");
    }
}
