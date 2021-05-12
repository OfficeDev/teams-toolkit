// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, Func, FxError, Plugin, PluginContext, QTreeNode, Result, Stage, SystemError, UserError } from "fx-api";
import { Telemetry } from "./constants";
import { ErrorMessage } from "./errors";
import { SqlPluginImpl } from "./plugin";
import { SqlResult, SqlResultFactory } from "./results";
import { DialogUtils } from "./utils/dialogUtils";
import { TelemetryUtils } from "./utils/telemetryUtils";

export class SqlPlugin implements Plugin {
    sqlImpl = new SqlPluginImpl();

    public async preProvision(ctx: PluginContext): Promise<SqlResult> {
        return this.runWithSqlError(Telemetry.stage.preProvision, () => this.sqlImpl.preProvision(ctx), ctx);
    }

    public async provision(ctx: PluginContext): Promise<SqlResult> {
        return this.runWithSqlError(Telemetry.stage.provision, () => this.sqlImpl.provision(ctx), ctx);
    }

    public async postProvision(ctx: PluginContext): Promise<SqlResult> {
        return this.runWithSqlError(Telemetry.stage.postProvision, () => this.sqlImpl.postProvision(ctx), ctx);
    }

    public async callFunc(func: Func, ctx: PluginContext): Promise<SqlResult> {
        return await this.sqlImpl.callFunc(func, ctx);
    }

    public async getQuestions(stage: Stage, ctx: PluginContext): Promise<Result<QTreeNode | undefined, FxError>> {
        return this.runWithSqlError(Telemetry.stage.postProvision, () => this.sqlImpl.getQuestions(stage, ctx), ctx);
    }

    private async runWithSqlError(stage: string, fn: () => Promise<SqlResult>, ctx: PluginContext): Promise<SqlResult> {
        try {
            return await fn();
        } catch (e) {
            await DialogUtils.progressBar?.end();

            if (!(e instanceof Error || e instanceof SystemError || e instanceof UserError)) {
                e = new Error(e.toString());
            }
            if (!(e instanceof SystemError) && !(e instanceof UserError)) {
                ctx.logProvider?.error(e.message);
            }

            let res: SqlResult;
            if (e instanceof SystemError || e instanceof UserError) {
                res = err(e);
            } else {
                res = err(SqlResultFactory.SystemError(ErrorMessage.UnhandledError.name, ErrorMessage.UnhandledError.message(), e));
            }
            const errorCode = res.error.source + "." + res.error.name;
            const errorType = res.error instanceof SystemError ? Telemetry.systemError : Telemetry.userError;
            TelemetryUtils.init(ctx);
            TelemetryUtils.sendErrorEvent(stage, errorCode, errorType, res.error.message);
            return res;
        }
    }
}

export default new SqlPlugin();
