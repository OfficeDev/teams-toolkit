// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    PluginContext,
    DialogMsg,
    DialogType,
    QuestionType,
    MsgLevel,
    IProgressHandler,
} from "@microsoft/teamsfx-api";
import { sqlPasswordValidatorGenerator, sqlUserNameValidator } from "./checkInput";
import { Constants } from "../constants";

export class DialogUtils {
    static progressBar: IProgressHandler | undefined;
    static ctx: PluginContext;

    public static init(ctx: PluginContext, progressTitle?: string, processStep?: number) {
        DialogUtils.ctx = ctx;
        if (progressTitle && processStep) {
            DialogUtils.progressBar = ctx.dialog?.createProgressBar(progressTitle, processStep);
        }
    }

    public static async output(message: string, level = MsgLevel.Info) {
        if (DialogUtils.ctx.dialog) {
            await DialogUtils.ctx.dialog.communicate(
                new DialogMsg(DialogType.Output, {
                    description: message,
                    level,
                }),
            );
        }
    }

    public static async show(message: string, level = MsgLevel.Info) {
        if (DialogUtils.ctx.dialog) {
            await DialogUtils.ctx.dialog.communicate(
                new DialogMsg(DialogType.Show, {
                    description: message,
                    level,
                }),
            );
        }
    }

    public static async askAdmin() {
        if (DialogUtils.ctx.dialog) {
            return (
                await DialogUtils.ctx.dialog.communicate(
                    new DialogMsg(
                        DialogType.Ask,
                        {
                            type: QuestionType.Text,
                            description: Constants.userQuestion.adminName,
                            prompt: Constants.userQuestion.adminName,
                            validateInput: (admin: string) => {
                                return sqlUserNameValidator(admin);
                            }
                        }
                    ),
                )
            ).getAnswer();
        }
    }

    public static async askAdminPassword(admin: string) {
        if (DialogUtils.ctx.dialog) {
            return (
                await DialogUtils.ctx.dialog.communicate(
                    new DialogMsg(
                        DialogType.Ask,
                        {
                            type: QuestionType.Text,
                            description: Constants.userQuestion.adminPassword,
                            prompt: Constants.userQuestion.adminPassword,
                            password: true,
                            validateInput: (password: string) => {
                                return sqlPasswordValidatorGenerator(admin)(password);
                            }
                        }
                    ),
                )
            ).getAnswer();
        }
    }

    public static async askPasswordConfirm() {
        if (DialogUtils.ctx.dialog) {
            return (
                await DialogUtils.ctx.dialog.communicate(
                    new DialogMsg(
                        DialogType.Ask,
                        {
                            type: QuestionType.Text,
                            description: Constants.userQuestion.confirmPassword,
                            prompt: Constants.userQuestion.adminPassword,
                            password: true,
                        }
                    ),
                )
            ).getAnswer();
        }
    }
}

export class ProgressTitle {
    static readonly Provision = "Provisioning SQL";
    static readonly ProvisionSteps = 2;
    static readonly PostProvision = "Configuring SQL";
    static readonly PostProvisionSteps = 2;
}

export class ProcessMessage {
    static readonly provisionSQL = "Provision SQL server";
    static readonly provisionDatabase = "Provision database";
    static readonly postProvisionAddAadmin = "Configure aad admin for SQL";
    static readonly postProvisionAddUser = "Configure database user";
}