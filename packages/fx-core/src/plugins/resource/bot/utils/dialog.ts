// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Dialog, DialogMsg, DialogType, MsgLevel, PluginContext, QuestionType } from "@microsoft/teamsfx-api";

export class DialogUtils {
    public static async output(ctx: PluginContext, message: string, level = MsgLevel.Info): Promise<void> {
        const content: DialogMsg = new DialogMsg(DialogType.Output, {
            description: message,
            level: level,
        });
        await this.communicate(ctx.dialog, content);
    }

    public static async show(ctx: PluginContext, message: string, level = MsgLevel.Info): Promise<void> {
        const content: DialogMsg = new DialogMsg(DialogType.Show, {
            description: message,
            level: level,
        });
        await this.communicate(ctx.dialog, content);
    }

    public static async ask(
        ctx: PluginContext,
        description: string,
        defaultAnswer: string,
        validateInput?: (value: string) => string | undefined | null | Promise<string | undefined | null>,
        options?: string[],
    ): Promise<string | undefined> {
        const questionType: QuestionType = options ? QuestionType.Radio : QuestionType.Text;

        const content: DialogMsg = new DialogMsg(DialogType.Ask, {
            type: questionType,
            description,
            defaultAnswer,
            validateInput,
            options,
        });
        return this.communicate(ctx.dialog, content);
    }

    public static async askEnum<T extends string>(
        ctx: PluginContext,
        description: string,
        targetEnum: { [key: string]: T },
        defaultValue: T,
    ): Promise<T | undefined> {
        const options = Object.values(targetEnum);
        const answer = await DialogUtils.ask(ctx, description, defaultValue, undefined, options);

        return options.find((x) => x === answer);
    }

    public static async showAndHelp(ctx: PluginContext, message: string, link: string, level = MsgLevel.Info): Promise<void> {
        const helpLabel = "Get Help";
        const content: DialogMsg = new DialogMsg(DialogType.Ask, {
            description: message,
            type: QuestionType.Confirm,
            options: [helpLabel]
        });

        const answer = await this.communicate(ctx.dialog, content);

        const openLink: DialogMsg = new DialogMsg(DialogType.Ask, {
            description: link,
            type: QuestionType.OpenExternal
        });

        if (answer === helpLabel) {
            await this.communicate(ctx.dialog, openLink);
        }
    }

    private static async communicate(dialog: Dialog | undefined, msg: DialogMsg): Promise<string | undefined> {
        if (dialog) {
            const answerMsg: DialogMsg = await dialog.communicate(msg);
            return answerMsg.getAnswer();
        }
    }
}
