// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Plugin, FxError, PluginContext, SystemError, UserError, Result, err, ok } from "teamsfx-api";
import { AssertNotEmpty, BuildError, UnhandledError } from "./error";
import { Telemetry } from "./telemetry";
import { AadPluginConfig, ApimPluginConfig, FunctionPluginConfig, SolutionConfig } from "./model/config";
import { AadDefaultValues, ProgressMessages, ProgressStep } from "./constants";
import { Factory } from "./factory";
import { IApimAnswer } from "./model/answer";
import { ProgressBar } from "./util/progressBar";

export class ApimPlugin implements Plugin {
    private answer: IApimAnswer = {};
    private progressBar: ProgressBar = new ProgressBar();

    public async preScaffold(ctx: PluginContext): Promise<Result<any, FxError>> {
        return await this.executeWithFxError(ProgressStep.None, _preScaffold, ctx);
    }

    public async scaffold(ctx: PluginContext): Promise<Result<any, FxError>> {
        return await this.executeWithFxError(ProgressStep.Scaffold, _scaffold, ctx);
    }

    public async provision(ctx: PluginContext): Promise<Result<any, FxError>> {
        return await this.executeWithFxError(ProgressStep.Provision, _provision, ctx);
    }

    public async postProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
        return await this.executeWithFxError(ProgressStep.PostProvision, _postProvision, ctx);
    }

    public async preDeploy(ctx: PluginContext): Promise<Result<any, FxError>> {
        return await this.executeWithFxError(ProgressStep.None, _preDeploy, ctx);
    }

    public async deploy(ctx: PluginContext): Promise<Result<any, FxError>> {
        return await this.executeWithFxError(ProgressStep.Deploy, _deploy, ctx);
    }

    private async executeWithFxError<T>(
        progressStep: ProgressStep,
        fn: (ctx: PluginContext, telemetry: Telemetry, progressBar: ProgressBar, answer: IApimAnswer, ...params: any[]) => Promise<T>,
        ctx: PluginContext,
        ...params: any[]
    ): Promise<Result<T, FxError>> {
        const telemetry = Factory.buildTelemetry(ctx);
        try {
            await this.progressBar.init(progressStep, ctx);
            const result = await fn(ctx, telemetry, this.progressBar, this.answer, ...params);
            return ok(result);
        } catch (error) {
            let packagedError: SystemError | UserError;
            if (error instanceof SystemError || error instanceof UserError) {
                packagedError = error;
            } else if (error instanceof Error) {
                packagedError = BuildError(UnhandledError, error);
            } else {
                packagedError = BuildError(UnhandledError);
            }

            // TODO: According to solution plugin's design to decide whether we need to keep the log and telemetry here.
            ctx.logProvider?.error(error.message);
            telemetry.sendErrorEvent(packagedError);
            return err(packagedError);
        } finally {
            await this.progressBar.close(progressStep);
        }
    }
}

async function _preScaffold(ctx: PluginContext, telemetry: Telemetry, progressBar: ProgressBar, answer: IApimAnswer): Promise<void> {
    const solutionConfig = new SolutionConfig(ctx.configOfOtherPlugins);
    const apimConfig = new ApimPluginConfig(ctx.config);
    const questionManager = await Factory.buildQuestionManager(ctx, solutionConfig, telemetry);

    await questionManager.preScaffold(apimConfig);
}

async function _scaffold(ctx: PluginContext, telemetry: Telemetry, progressBar: ProgressBar, answer: IApimAnswer): Promise<void> {
    const solutionConfig = new SolutionConfig(ctx.configOfOtherPlugins);
    const apimManager = await Factory.buildApimManager(ctx, solutionConfig, telemetry);

    await progressBar.next(ProgressStep.Scaffold, ProgressMessages[ProgressStep.Scaffold].Scaffold);
    await apimManager.scaffold(ctx.app, ctx.root);
}

async function _provision(ctx: PluginContext, telemetry: Telemetry, progressBar: ProgressBar, answer: IApimAnswer): Promise<void> {
    const solutionConfig = new SolutionConfig(ctx.configOfOtherPlugins);
    const apimConfig = new ApimPluginConfig(ctx.config);

    const apimManager = await Factory.buildApimManager(ctx, solutionConfig, telemetry);
    const aadManager = await Factory.buildAadManager(ctx, telemetry);

    await progressBar.next(ProgressStep.Provision, ProgressMessages[ProgressStep.Provision].CreateApim);
    await apimManager.provision(apimConfig, solutionConfig, ctx.app.name.short);

    await progressBar.next(ProgressStep.Provision, ProgressMessages[ProgressStep.Provision].CreateAad);
    await aadManager.provision(apimConfig, ctx.app.name.short);
}

async function _postProvision(ctx: PluginContext, telemetry: Telemetry, progressBar: ProgressBar, answer: IApimAnswer): Promise<void> {
    const solutionConfig = new SolutionConfig(ctx.configOfOtherPlugins);
    const apimConfig = new ApimPluginConfig(ctx.config);
    const aadConfig = new AadPluginConfig(ctx.configOfOtherPlugins);

    const apimManager = await Factory.buildApimManager(ctx, solutionConfig, telemetry);
    const aadManager = await Factory.buildAadManager(ctx, telemetry);
    const teamsAppAadManager = await Factory.buildTeamsAppAadManager(ctx, telemetry);

    await progressBar.next(ProgressStep.PostProvision, ProgressMessages[ProgressStep.PostProvision].ConfigClientAad);
    await aadManager.postProvision(apimConfig, aadConfig, AadDefaultValues.redirectUris);

    await progressBar.next(ProgressStep.PostProvision, ProgressMessages[ProgressStep.PostProvision].ConfigApim);
    await apimManager.postProvision(apimConfig, solutionConfig, aadConfig, ctx.app.name.short);

    await progressBar.next(ProgressStep.PostProvision, ProgressMessages[ProgressStep.PostProvision].ConfigAppAad);
    await teamsAppAadManager.postProvision(aadConfig, apimConfig);
}

async function _preDeploy(ctx: PluginContext, telemetry: Telemetry, progressBar: ProgressBar, answer: IApimAnswer): Promise<void> {
    const solutionConfig = new SolutionConfig(ctx.configOfOtherPlugins);
    const apimConfig = new ApimPluginConfig(ctx.config);
    const questionManager = await Factory.buildQuestionManager(ctx, solutionConfig, telemetry);

    await questionManager.preDeploy(solutionConfig, apimConfig, ctx.root, AssertNotEmpty("answer", answer));
}

async function _deploy(ctx: PluginContext, telemetry: Telemetry, progressBar: ProgressBar, answer: IApimAnswer): Promise<void> {
    const solutionConfig = new SolutionConfig(ctx.configOfOtherPlugins);
    const apimConfig = new ApimPluginConfig(ctx.config);
    const functionConfig = new FunctionPluginConfig(ctx.configOfOtherPlugins);

    const apimManager = await Factory.buildApimManager(ctx, solutionConfig, telemetry);

    await progressBar.next(ProgressStep.Deploy, ProgressMessages[ProgressStep.Deploy].ImportApi);
    await apimManager.deploy(apimConfig, solutionConfig, functionConfig, AssertNotEmpty("answer", answer), ctx.root);
}

export default new ApimPlugin();
