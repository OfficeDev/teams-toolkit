// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Plugin, PluginContext, Result, QTreeNode, Stage, FxError, err, UserError, SystemError } from "fx-api";

import { FxResult, FxBotPluginResultFactory as ResultFactory } from "./result";
import { TeamsBotImpl } from "./plugin";
import { ProgressBarFactory } from "./progressBars";
import { ProgressBarConstants } from "./constants";
import { ExceptionType, PluginException } from "./exceptions";
import { Logger } from "./logger";

export class TeamsBot implements Plugin {
    public teamsBotImpl: TeamsBotImpl = new TeamsBotImpl();
    private ctx?: PluginContext;

    public async getQuestions(stage: Stage, ctx: PluginContext): Promise<Result<QTreeNode | undefined, FxError>> {
        return this.teamsBotImpl.getQuestions(stage, ctx);
    }

    public async preScaffold(context: PluginContext): Promise<FxResult> {
        this.ctx = context; // Save to be used.
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.preScaffold(context));
    }

    public async scaffold(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        const result = await this.runWithExceptionCatching(() => this.teamsBotImpl.scaffold(context));

        await ProgressBarFactory.closeProgressBar(ProgressBarConstants.SCAFFOLD_TITLE);

        return result;
    }

    public async preProvision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.preProvision(context));
    }

    public async provision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        const result = await this.runWithExceptionCatching(() => this.teamsBotImpl.provision(context));

        await ProgressBarFactory.closeProgressBar(ProgressBarConstants.PROVISION_TITLE);

        return result;
    }

    public async postProvision(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.postProvision(context));
    }

    public async preDeploy(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.preDeploy(context));
    }

    public async deploy(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        const result = await this.runWithExceptionCatching(() => this.teamsBotImpl.deploy(context));

        await ProgressBarFactory.closeProgressBar(ProgressBarConstants.DEPLOY_TITLE);

        return result;
    }

    public async localDebug(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        const result = await this.runWithExceptionCatching(() => this.teamsBotImpl.localDebug(context));

        await ProgressBarFactory.closeProgressBar(ProgressBarConstants.LOCAL_DEBUG_TITLE);

        return result;
    }

    public async postLocalDebug(context: PluginContext): Promise<FxResult> {

        this.ctx = context;
        Logger.setLogger(context.logProvider);

        return await this.runWithExceptionCatching(() => this.teamsBotImpl.postLocalDebug(context));

    }

    private async runWithExceptionCatching(fn: () => Promise<FxResult>): Promise<FxResult> {
        try {
            return await fn();
        } catch (e) {
            this.ctx?.logProvider?.debug(`On top exception: ${e}.`);

            await ProgressBarFactory.closeProgressBar(); // Close all progress bars.

            if (e instanceof UserError || e instanceof SystemError) {
                return err(e);
            }

            if (e instanceof PluginException) {

                const result = (e.exceptionType === ExceptionType.System ?
                    ResultFactory.SystemError(e.name, e.genMessage(), undefined, e.innerError) :
                    ResultFactory.UserError(e.name, e.genMessage(), undefined, e.innerError));
                return result;
            } else {
                // Unrecognized Exception.
                return ResultFactory.SystemError(e.name, e.message, undefined, e);
            }

        }
    }
}

export default new TeamsBot();
