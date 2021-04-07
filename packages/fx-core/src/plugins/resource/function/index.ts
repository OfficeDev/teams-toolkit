
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Func, FxError, Plugin, PluginContext, QTreeNode, Result, Stage, SystemError, UserError, err } from "fx-api";

import { DeploySteps, PostProvisionSteps, PreDeploySteps, ProvisionSteps, ScaffoldSteps, StepHelperFactory } from "./resources/steps";
import { ErrorType, FunctionPluginError } from "./resources/errors";
import { FunctionPluginImpl } from "./plugin";
import { FxResult, FunctionPluginResultFactory as ResultFactory } from "./result";
import { LifeCycle } from "./enums";
import { Logger } from "./utils/logger";
import { telemetryHelper } from "./utils/telemetry-helper";

// This layer tries to provide a uniform exception handling for function plugin.
export class FunctionPlugin implements Plugin {
    functionPluginImpl: FunctionPluginImpl = new FunctionPluginImpl();

    public async callFunc(func: Func, ctx: PluginContext): Promise<FxResult> {
        return await this.functionPluginImpl.callFunc(func, ctx);
    }

    public async getQuestions(stage: Stage, ctx: PluginContext): Promise<Result<QTreeNode | undefined, FxError>> {
        Logger.setLogger(ctx.logProvider);
        const res = await this.runWithErrorWrapper(ctx, LifeCycle.getQuestions,
            () => Promise.resolve(this.functionPluginImpl.getQuestions(stage, ctx))
        );
        return res;
    }

    public async preScaffold(ctx: PluginContext): Promise<FxResult> {
        Logger.setLogger(ctx.logProvider);
        const res = await this.runWithErrorWrapper(ctx, LifeCycle.preScaffold,
            () => this.functionPluginImpl.preScaffold(ctx)
        );
        return res;
    }

    public async scaffold(ctx: PluginContext): Promise<FxResult> {
        Logger.setLogger(ctx.logProvider);
        await StepHelperFactory.scaffoldStepHelper.start(
            Object.entries(ScaffoldSteps).length, ctx.dialog);
        const res = await this.runWithErrorWrapper(ctx, LifeCycle.scaffold,
            () => this.functionPluginImpl.scaffold(ctx)
        );
        await StepHelperFactory.scaffoldStepHelper.end();
        return res;
    }

    public async preProvision(ctx: PluginContext): Promise<FxResult> {
        Logger.setLogger(ctx.logProvider);
        const res = await this.runWithErrorWrapper(ctx, LifeCycle.preProvision,
            () => this.functionPluginImpl.preProvision(ctx)
        );
        return res;
    }

    public async provision(ctx: PluginContext): Promise<FxResult> {
        Logger.setLogger(ctx.logProvider);
        await StepHelperFactory.provisionStepHelper.start(
            Object.entries(ProvisionSteps).length, ctx.dialog);
        const res = await this.runWithErrorWrapper(ctx, LifeCycle.provision,
            () => this.functionPluginImpl.provision(ctx)
        );
        await StepHelperFactory.provisionStepHelper.end();
        return res;
    }

    public async postProvision(ctx: PluginContext): Promise<FxResult> {
        Logger.setLogger(ctx.logProvider);
        await StepHelperFactory.postProvisionStepHelper.start(
            Object.entries(PostProvisionSteps).length, ctx.dialog);
        const res = await this.runWithErrorWrapper(ctx, LifeCycle.postProvision,
            () => this.functionPluginImpl.postProvision(ctx)
        );
        await StepHelperFactory.postProvisionStepHelper.end();
        return res;
    }

    public async preDeploy(ctx: PluginContext): Promise<FxResult> {
        Logger.setLogger(ctx.logProvider);
        await StepHelperFactory.preDeployStepHelper.start(
            Object.entries(PreDeploySteps).length, ctx.dialog);
        const res = await this.runWithErrorWrapper(ctx, LifeCycle.preDeploy,
            () => this.functionPluginImpl.preDeploy(ctx)
        );
        await StepHelperFactory.preDeployStepHelper.end();
        return res;
    }

    public async deploy(ctx: PluginContext): Promise<FxResult> {
        Logger.setLogger(ctx.logProvider);
        await StepHelperFactory.deployStepHelper.start(
            Object.entries(DeploySteps).length, ctx.dialog);
        const res = await this.runWithErrorWrapper(ctx, LifeCycle.deploy,
            () => this.functionPluginImpl.deploy(ctx)
        );
        await StepHelperFactory.deployStepHelper.end();
        return res;
    }

    private async runWithErrorWrapper(ctx: PluginContext, name: string, fn: () => Promise<FxResult>): Promise<FxResult> {
        try {
            telemetryHelper.sendStartEvent(ctx, name);
            const res: FxResult = await fn();
            telemetryHelper.sendResultEvent(ctx, name, res);
            return res;
        } catch (e) {
            if (e instanceof UserError || e instanceof SystemError) {
                const res = err(e);
                telemetryHelper.sendResultEvent(ctx, name, res);
                return res;
            }

            if (e instanceof FunctionPluginError) {
                const res = e.errorType === ErrorType.User ?
                    ResultFactory.UserError(e.getMessage(), e.code, undefined, e, e.stack) :
                    ResultFactory.SystemError(e.getMessage(), e.code, undefined, e, e.stack);
                telemetryHelper.sendResultEvent(ctx, name, res);
                return res;
            }

            const UnhandledErrorCode = "UnhandledError";
            /* Never send unhandled error message for privacy concern. */
            telemetryHelper.sendResultEvent(ctx, name, ResultFactory.SystemError("Got an unhandled error", UnhandledErrorCode));
            return ResultFactory.SystemError(e.message, UnhandledErrorCode, undefined, e, e.stack);
        }
    }
}

export default new FunctionPlugin();
