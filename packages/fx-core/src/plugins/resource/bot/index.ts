// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Plugin, PluginContext, Result, QTreeNode, Stage, FxError, err, UserError, SystemError } from "@microsoft/teamsfx-api";

import { FxResult, FxBotPluginResultFactory as ResultFactory } from "./result";
import { TeamsBotImpl } from "./plugin";
import { ProgressBarFactory } from "./progressBars";
import { LifecycleFuncNames, ProgressBarConstants, TelemetryKeys, TelemetryValues } from "./constants";
import { ErrorType, PluginError } from "./errors";
import { Logger } from "./logger";
import { PluginBot } from "./resources/strings";

export class TeamsBot implements Plugin {
    public teamsBotImpl: TeamsBotImpl = new TeamsBotImpl();
    private ctx?: PluginContext;

    public async getQuestions(stage: Stage, ctx: PluginContext): Promise<Result<QTreeNode | undefined, FxError>> {
        return this.teamsBotImpl.getQuestions(stage, ctx);
    }

    public async preScaffold(context: PluginContext): Promise<FxResult> {
        this.ctx = context; // Save to be used.
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.preScaffold(context), true, LifecycleFuncNames.PRE_SCAFFOLD);
    }

    public async scaffold(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        const result = await this.runWithExceptionCatching(() => this.teamsBotImpl.scaffold(context), true, LifecycleFuncNames.SCAFFOLD);

        await ProgressBarFactory.closeProgressBar(ProgressBarConstants.SCAFFOLD_TITLE);

        return result;
    }

    public async preProvision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.preProvision(context), true, LifecycleFuncNames.PRE_PROVISION);
    }

    public async provision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        const result = await this.runWithExceptionCatching(() => this.teamsBotImpl.provision(context), true, LifecycleFuncNames.PROVISION);

        await ProgressBarFactory.closeProgressBar(ProgressBarConstants.PROVISION_TITLE);

        return result;
    }

    public async postProvision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.postProvision(context), true, LifecycleFuncNames.POST_PROVISION);
    }

    public async preDeploy(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.preDeploy(context), true, LifecycleFuncNames.PRE_DEPLOY);
    }

    public async deploy(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        const result = await this.runWithExceptionCatching(() => this.teamsBotImpl.deploy(context), true, LifecycleFuncNames.DEPLOY);

        await ProgressBarFactory.closeProgressBar(ProgressBarConstants.DEPLOY_TITLE);

        return result;
    }

    public async localDebug(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        const result = await this.runWithExceptionCatching(() => this.teamsBotImpl.localDebug(context), false, LifecycleFuncNames.LOCAL_DEBUG);

        await ProgressBarFactory.closeProgressBar(ProgressBarConstants.LOCAL_DEBUG_TITLE);

        return result;
    }

    public async postLocalDebug(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.postLocalDebug(context), false, LifecycleFuncNames.POST_LOCAL_DEBUG);
    }

    private async runWithExceptionCatching(fn: () => Promise<FxResult>, sendErrorTelemetry: boolean, name: string): Promise<FxResult> {
        try {
            return await fn();
        } catch (e) {
            if (sendErrorTelemetry) {
                this.ctx?.telemetryReporter?.sendTelemetryErrorEvent(name, {
                    TelemetryKeys.Component : PluginBot.PLUGIN_NAME,
                    
                });
            }   

            await ProgressBarFactory.closeProgressBar(); // Close all progress bars.

            if (e instanceof UserError || e instanceof SystemError) {
                return err(e);
            }

            if (e instanceof PluginError) {
                const result = (e.errorType === ErrorType.System ?
                    ResultFactory.SystemError(e.name, e.genMessage(), e.innerError) :
                    ResultFactory.UserError(e.name, e.genMessage(), e.showHelpLink, e.innerError));
                return result;
            } else {
                // Unrecognized Exception.
                return ResultFactory.SystemError(e.name, e.message, e);
            }

        }
    }
}

export default new TeamsBot();
