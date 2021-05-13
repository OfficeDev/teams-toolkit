// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Plugin, PluginContext, SystemError, UserError, err } from "@microsoft/teamsfx-api";
import { Messages, Telemetry } from "./constants";
import { UnhandledError } from "./errors";
import { SimpleAuthPluginImpl } from "./plugin";
import { SimpleAuthResult, ResultFactory } from "./result";
import { DialogUtils } from "./utils/dialog";
import { TelemetryUtils } from "./utils/telemetry";

export class SimpleAuthPlugin implements Plugin {
    simpleAuthPluginImpl = new SimpleAuthPluginImpl();

    public async localDebug(ctx: PluginContext): Promise<SimpleAuthResult> {
        return this.runWithSimpleAuthError(() => this.simpleAuthPluginImpl.localDebug(ctx), ctx, Messages.EndLocalDebug.telemetry);
    }

    public async postLocalDebug(ctx: PluginContext): Promise<SimpleAuthResult> {
        return this.runWithSimpleAuthError(() => this.simpleAuthPluginImpl.postLocalDebug(ctx), ctx, Messages.EndPostLocalDebug.telemetry);
    }

    public async provision(ctx: PluginContext): Promise<SimpleAuthResult> {
        return this.runWithSimpleAuthError(() => this.simpleAuthPluginImpl.provision(ctx), ctx, Messages.EndProvision.telemetry);
    }

    public async postProvision(ctx: PluginContext): Promise<SimpleAuthResult> {
        return this.runWithSimpleAuthError(() => this.simpleAuthPluginImpl.postProvision(ctx), ctx, Messages.EndPostProvision.telemetry);
    }

    private async runWithSimpleAuthError(fn: () => Promise<SimpleAuthResult>, ctx: PluginContext, stage: string): Promise<SimpleAuthResult> {
        try {
            return await fn();
        } catch (e) {
            DialogUtils.progressBar?.end();

            if (!(e instanceof Error || e instanceof SystemError || e instanceof UserError)) {
                e = new Error(e.toString());
            }
            ctx.logProvider?.error(e.message);
            TelemetryUtils.init(ctx);

            if (e instanceof SystemError || e instanceof UserError) {
                TelemetryUtils.sendErrorEvent(stage, e.name, e instanceof UserError ? Telemetry.userError : Telemetry.systemError, e.message);
                return err(e);
            } else {
                TelemetryUtils.sendErrorEvent(stage, UnhandledError.name, Telemetry.systemError, UnhandledError.message(e?.message));
                return err(ResultFactory.SystemError(UnhandledError.name, UnhandledError.message(e?.message), e));
            }
        }
    }
}

export default new SimpleAuthPlugin();
