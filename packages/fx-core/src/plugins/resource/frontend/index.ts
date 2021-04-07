// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FrontendPluginImpl } from "./plugin";
import { Plugin, PluginContext, SystemError, UserError, err } from "fx-api";

import { ErrorFactory, TeamsFxResult } from "./error-factory";
import { ErrorType, FrontendPluginError, UnhandledErrorCode, UnhandledErrorMessage } from "./resources/errors";
import { Logger } from "./utils/logger";
import { ProgressHelper } from "./utils/progress-helper";
import { TelemetryEvent } from "./constants";
import { telemetryHelper } from "./utils/telemetry-helper";

export class FrontendPlugin implements Plugin {
    frontendPluginImpl = new FrontendPluginImpl();

    public async scaffold(ctx: PluginContext): Promise<TeamsFxResult> {
        Logger.setLogger(ctx.logProvider);
        return this.runWithErrorHandling(ctx, TelemetryEvent.scaffold, () => this.frontendPluginImpl.scaffold(ctx));
    }

    public async preProvision(ctx: PluginContext): Promise<TeamsFxResult> {
        Logger.setLogger(ctx.logProvider);
        return this.runWithErrorHandling(ctx, TelemetryEvent.PreProvision, () =>
            this.frontendPluginImpl.preProvision(ctx),
        );
    }

    public async provision(ctx: PluginContext): Promise<TeamsFxResult> {
        Logger.setLogger(ctx.logProvider);
        return this.runWithErrorHandling(ctx, TelemetryEvent.Provision, () => this.frontendPluginImpl.provision(ctx));
    }

    public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
        Logger.setLogger(ctx.logProvider);
        return this.runWithErrorHandling(ctx, TelemetryEvent.PostProvision, () =>
            this.frontendPluginImpl.postProvision(ctx),
        );
    }

    public async preDeploy(ctx: PluginContext): Promise<TeamsFxResult> {
        Logger.setLogger(ctx.logProvider);
        return this.runWithErrorHandling(ctx, TelemetryEvent.PreDeploy, () => this.frontendPluginImpl.preDeploy(ctx));
    }

    public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
        Logger.setLogger(ctx.logProvider);
        return this.runWithErrorHandling(ctx, TelemetryEvent.Deploy, () => this.frontendPluginImpl.deploy(ctx));
    }

    private async runWithErrorHandling(
        ctx: PluginContext,
        stage: string,
        fn: () => Promise<TeamsFxResult>,
    ): Promise<TeamsFxResult> {
        try {
            telemetryHelper.sendSuccessEvent(ctx, stage + TelemetryEvent.startSuffix);
            const result = await fn();
            telemetryHelper.sendSuccessEvent(ctx, stage);
            return result;
        } catch (e) {
            await ProgressHelper.endAllHandlers();

            if (e instanceof FrontendPluginError) {
                const error =
                    e.errorType === ErrorType.User
                        ? ErrorFactory.UserError(e.code, e.getMessage())
                        : ErrorFactory.SystemError(e.code, e.getMessage(), e.getInnerError(), e.getInnerError()?.stack);
                telemetryHelper.sendErrorEvent(ctx, stage, error);
                return err(error);
            }

            const error = ErrorFactory.SystemError(UnhandledErrorCode, UnhandledErrorMessage, e, e.stack);
            telemetryHelper.sendErrorEvent(ctx, stage, error);
            return err(error);
        }
    }
}

export default new FrontendPlugin();
