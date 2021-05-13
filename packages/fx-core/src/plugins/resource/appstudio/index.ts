// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    ConfigFolderName, FxError, NodeType, ok, err, Platform, Plugin, PluginContext, QTreeNode, Result, Stage,
    DialogMsg, DialogType, MsgLevel, QuestionType, SystemError, UserError
} from "@microsoft/teamsfx-api";
import { AppStudioPluginImpl } from "./plugin";
import { Constants } from "./constants";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { manuallySubmitOption, autoPublishOption } from "./questions";
import { TelemetryUtils, TelemetryEventName, TelemetryPropertyKey } from "./utils/telemetry";

export class AppStudioPlugin implements Plugin {
    private appStudioPluginImpl = new AppStudioPluginImpl();

    async getQuestions(
        stage: Stage,
        ctx: PluginContext
    ): Promise<Result<QTreeNode | undefined, FxError>> {
        const appStudioQuestions = new QTreeNode({
            type: NodeType.group
        });

        if (stage === Stage.publish) {
            if (ctx.platform === Platform.VS) {
                const appPath = new QTreeNode({
                    type: NodeType.folder,
                    name: Constants.PUBLISH_PATH_QUESTION,
                    title: "Please select the folder contains manifest.json and icons",
                    default: `${ctx.root}/.${ConfigFolderName}`,
                    validation: {
                        required: true,
                    },
                });
                appStudioQuestions.addChild(appPath);

                const remoteTeamsAppId = new QTreeNode({
                    type: NodeType.text,
                    name: Constants.REMOTE_TEAMS_APP_ID,
                    title: "Please input the teams app id in App Studio"
                });
                appStudioQuestions.addChild(remoteTeamsAppId);
            } else {
                const buildOrPublish = new QTreeNode({
                    name: Constants.BUILD_OR_PUBLISH_QUESTION,
                    type: NodeType.singleSelect,
                    option: [manuallySubmitOption, autoPublishOption],
                    title: "Teams Toolkit: Publish to Teams",
                    default: autoPublishOption.id
                });
                appStudioQuestions.addChild(buildOrPublish);
            }
        }

        return ok(appStudioQuestions);
    }

    /**
     * Validate manifest string against schema
     * @param {string} manifestString - the string of manifest.json file
     * @returns {string[]} an array of errors
     */
    public async validateManifest(ctx: PluginContext, manifestString: string): Promise<Result<string[], FxError>> {
        TelemetryUtils.init(ctx);
        TelemetryUtils.sendStartEvent(TelemetryEventName.validateManifest);
        const validationResult = await this.appStudioPluginImpl.validateManifest(ctx, manifestString);
        if (validationResult.length > 0) {
            const errMessage = AppStudioError.ValidationFailedError.message(validationResult);
            ctx.logProvider?.error("Manifest Validation failed!");
            await ctx.dialog?.communicate(
                new DialogMsg(DialogType.Show, {
                    description: errMessage,
                    level: MsgLevel.Error,
                }),
            );
            return err(AppStudioResultFactory.UserError(AppStudioError.ValidationFailedError.name, errMessage));
        }
        const validationSuccess = "Manifest Validation succeed!";
        ctx.logProvider?.info(validationSuccess);
        await ctx.dialog?.communicate(
            new DialogMsg(DialogType.Show, {
                description: validationSuccess,
                level: MsgLevel.Info,
            }),
        );
        let properties: { [key: string]: string } = {};
        properties[TelemetryPropertyKey.validationResult] = validationResult.join("\n");
        TelemetryUtils.sendSuccessEvent(TelemetryEventName.validateManifest, properties);
        return ok(validationResult);
    }

    /**
     * Build Teams Package
     * @param {string} appDirectory - The directory contains manifest.source.json and two images
     * @returns {string} - Path of built appPackage.zip
     */
    public async buildTeamsPackage(ctx: PluginContext, appDirectory: string, manifestString: string): Promise<Result<string, FxError>> {
        TelemetryUtils.init(ctx);
        TelemetryUtils.sendStartEvent(TelemetryEventName.buildTeamsPackage);
        try {
            const appPackagePath = await this.appStudioPluginImpl.buildTeamsAppPackage(ctx, appDirectory, manifestString);
            const builtSuccess = `Teams Package ${appPackagePath} built successfully!`;
            ctx.logProvider?.info(builtSuccess);
            await ctx.dialog?.communicate(
                new DialogMsg(DialogType.Show, {
                    description: builtSuccess,
                    level: MsgLevel.Info,
                }),
            );
            TelemetryUtils.sendSuccessEvent(TelemetryEventName.buildTeamsPackage);
            return ok(appPackagePath);
        } catch (error) {
            TelemetryUtils.sendErrorEvent(TelemetryEventName.buildTeamsPackage, error);
            return err(AppStudioResultFactory.SystemError(
                AppStudioError.TeamsPackageBuildError.name,
                AppStudioError.TeamsPackageBuildError.message(error)
            ));
        }
    }

    /**
     * Publish the app to Teams App Catalog
     * @param {PluginContext} ctx
     * @returns {string[]} - Teams App ID in Teams app catalog
     */
    public async publish(ctx: PluginContext): Promise<Result<string | undefined, FxError>> {
        TelemetryUtils.init(ctx);
        TelemetryUtils.sendStartEvent(TelemetryEventName.publish);
        if (ctx.platform !== Platform.VS) {
            const answer = ctx.answers?.get(Constants.BUILD_OR_PUBLISH_QUESTION);
            if (answer === manuallySubmitOption.id) {
                const appDirectory = `${ctx.root}/.${ConfigFolderName}`;
                const manifestString = JSON.stringify(ctx.app);
                try {
                    const appPackagePath = await this.appStudioPluginImpl.buildTeamsAppPackage(ctx, appDirectory, manifestString);
                    const answer = (await ctx.dialog?.communicate(
                        new DialogMsg(DialogType.Show, {
                            description: `Successfully created ${ctx.app.name.short} app package file at ${appPackagePath}. Send this to your administrator for approval.`,
                            level: MsgLevel.Info,
                            items: ["OK", Constants.READ_MORE]
                        })
                    ))?.getAnswer();
                    if (answer === Constants.READ_MORE) {
                        await ctx.dialog?.communicate(
                            new DialogMsg(DialogType.Ask, {
                                description: Constants.PUBLISH_GUIDE,
                                type: QuestionType.OpenExternal
                            })
                        )
                    }
                    TelemetryUtils.sendSuccessEvent(TelemetryEventName.publish);
                    return ok(appPackagePath);
                }
                catch (error) {
                    TelemetryUtils.sendErrorEvent(TelemetryEventName.publish, error);
                    return err(AppStudioResultFactory.SystemError(
                        AppStudioError.TeamsPackageBuildError.name,
                        AppStudioError.TeamsPackageBuildError.message(error)
                    ));
                }
            }
        }

        try {
            const result = await this.appStudioPluginImpl.publish(ctx);
            ctx.logProvider?.info(`Publish success!`);
            await ctx.dialog?.communicate(
                new DialogMsg(DialogType.Show, {
                    description: `${result.name} successfully published to the admin portal. Once approved, your app will be available for your organization.`,
                    level: MsgLevel.Info,
                }),
            );
            TelemetryUtils.sendSuccessEvent(TelemetryEventName.publish);
            return ok(result.id);
        } catch (error) {
            if (error instanceof SystemError || error instanceof UserError) {
                if (error.name === AppStudioError.TeamsAppPublishCancelError.name) {
                    TelemetryUtils.sendSuccessEvent(TelemetryEventName.publish);
                    return ok(undefined);
                }
                const innerError = error.innerError ? `innerError: ${error.innerError}` : "";
                error.message = `${error.message} ${innerError}`;
                TelemetryUtils.sendErrorEvent(TelemetryEventName.publish, error);
                return err(error);
            } else {
                const unhandled = new SystemError(AppStudioError.UnhandledError.name,
                    AppStudioError.UnhandledError.message, Constants.PLUGIN_NAME, undefined, undefined, error);
                TelemetryUtils.sendErrorEvent(TelemetryEventName.publish, unhandled);
                return err(unhandled);
            }
        }
    }
}
