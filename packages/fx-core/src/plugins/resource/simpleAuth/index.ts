// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Plugin, PluginContext, SystemError, UserError, err } from "fx-api";
import { UnhandledError } from "./errors";
import { SimpleAuthPluginImpl } from "./plugin";
import { SimpleAuthResult, ResultFactory } from "./result";
import { DialogUtils } from "./utils/dialog";
import { TelemetryUtils } from "./utils/telemetry";

export class SimpleAuthPlugin implements Plugin {
    simpleAuthPluginImpl = new SimpleAuthPluginImpl();

    public async localDebug(ctx: PluginContext): Promise<SimpleAuthResult> {
        return this.runWithSimpleAuthError(() => this.simpleAuthPluginImpl.localDebug(ctx), ctx);
    }

    public async postLocalDebug(ctx: PluginContext): Promise<SimpleAuthResult> {
        return this.runWithSimpleAuthError(() => this.simpleAuthPluginImpl.postLocalDebug(ctx), ctx);
    }

    public async provision(ctx: PluginContext): Promise<SimpleAuthResult> {
        return this.runWithSimpleAuthError(() => this.simpleAuthPluginImpl.provision(ctx), ctx);
    }

    public async postProvision(ctx: PluginContext): Promise<SimpleAuthResult> {
        return this.runWithSimpleAuthError(() => this.simpleAuthPluginImpl.postProvision(ctx), ctx);
    }

    private async runWithSimpleAuthError(fn: () => Promise<SimpleAuthResult>, ctx: PluginContext): Promise<SimpleAuthResult> {
        try {
            return await fn();
        } catch (e) {
            DialogUtils.progressBar?.end();

            if (!(e instanceof Error || e instanceof SystemError || e instanceof UserError)) {
                e = new Error(e.toString());
            }
            ctx.logProvider?.error(e.message);
            TelemetryUtils.init(ctx);
            TelemetryUtils.sendException(e);

            if (e instanceof SystemError || e instanceof UserError) {
                return err(e);
            } else {
                return err(ResultFactory.SystemError(UnhandledError.name, UnhandledError.message(e?.message), e));
            }
        }
    }
}

export default new SimpleAuthPlugin();
