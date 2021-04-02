// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from '../utils/common';
import { CommonStrings } from '../resources/strings';
import { ConfigValue, PluginContext } from 'teamsfx-api';
import { ProgrammingLanguage } from '../enums/programmingLanguage';
import { WayToRegisterBot } from '../enums/wayToRegisterBot';

export class ScaffoldConfig {
    public botId?: string;
    public botPassword?: string;
    public programmingLanguage?: ProgrammingLanguage;
    public wayToRegisterBot?: WayToRegisterBot;
    public workingDir?: string;
    public scaffolded: boolean = false;

    public async restoreConfigFromContext(context: PluginContext) {

        this.workingDir = `${context.root}/${CommonStrings.BOT_WORKING_DIR_NAME}`;

        const botIdValue: ConfigValue = context.config.get('botId');
        if (botIdValue) {
            this.botId = botIdValue as string;
        }

        const botPasswordValue: ConfigValue = context.config.get('botPassword');
        if (botPasswordValue) {
            this.botPassword = botPasswordValue as string;
        }

        let rawProgrammingLanguage: string = '';
        const programmingLanguageValue: ConfigValue = context.config.get('programmingLanguage');
        if (programmingLanguageValue) {
            rawProgrammingLanguage = programmingLanguageValue as string;
        }

        if (rawProgrammingLanguage && utils.existsInEnumValues(rawProgrammingLanguage, ProgrammingLanguage)) {
            this.programmingLanguage = rawProgrammingLanguage as ProgrammingLanguage;
        }

        let rawWay: string = '';
        const wayValue: ConfigValue = context.config.get('wayToRegisterBot');
        if (wayValue) {
            rawWay = wayValue as string;
        }

        if (rawWay && utils.existsInEnumValues(rawWay, WayToRegisterBot)) {
            this.wayToRegisterBot = rawWay as WayToRegisterBot;
        }

        const scaffoldedValue: ConfigValue = context.config.get('scaffolded');
        if (scaffoldedValue) {
            this.scaffolded = (scaffoldedValue as string) === 'true';
        }
    }

    public saveConfigIntoContext(context: PluginContext) {
        utils.checkAndSaveConfig(context, 'botId', this.botId);
        utils.checkAndSaveConfig(context, 'botPassword', this.botPassword);
        utils.checkAndSaveConfig(context, 'programmingLanguage', this.programmingLanguage);
        utils.checkAndSaveConfig(context, 'wayToRegisterBot', this.wayToRegisterBot);
        utils.checkAndSaveConfig(context, 'scaffolded', this.scaffolded ? 'true' : 'false');
    }
}
