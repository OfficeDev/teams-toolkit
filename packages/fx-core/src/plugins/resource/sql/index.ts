// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, Func, FxError, Plugin, PluginContext, QTreeNode, Result, Stage, SystemError, UserError } from "@microsoft/teamsfx-api";
import { ErrorMessage } from "./errors";
import { SqlPluginImpl } from "./plugin";
import { SqlResult, SqlResultFactory } from "./results";
import { DialogUtils } from "./utils/dialogUtils";
import { TelemetryUtils } from "./utils/telemetryUtils";

export class SqlPlugin implements Plugin {
    sqlImpl = new SqlPluginImpl();

    public async preProvision(ctx: PluginContext): Promise<SqlResult> {
        return this.runWithSqlError(() => this.sqlImpl.preProvision(ctx), ctx);
    }

    public async provision(ctx: PluginContext): Promise<SqlResult> {
        return this.runWithSqlError(() => this.sqlImpl.provision(ctx), ctx);
    }

    public async postProvision(ctx: PluginContext): Promise<SqlResult> {
        return this.runWithSqlError(() => this.sqlImpl.postProvision(ctx), ctx);
    }

    public async callFunc(func: Func, ctx: PluginContext): Promise<SqlResult> {
        return await this.sqlImpl.callFunc(func, ctx);
    }

    public async getQuestions(stage: Stage, ctx: PluginContext): Promise<Result<QTreeNode | undefined, FxError>> {
        return this.runWithSqlError(() => this.sqlImpl.getQuestions(stage, ctx), ctx);
    }

    private async runWithSqlError(fn: () => Promise<SqlResult>, ctx: PluginContext): Promise<SqlResult> {
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
            TelemetryUtils.init(ctx);
            TelemetryUtils.sendException(e);

            if (e instanceof SystemError || e instanceof UserError) {
                return err(e);
            } else {
                return err(SqlResultFactory.SystemError(ErrorMessage.UnhandledError.name, ErrorMessage.UnhandledError.message(), e));
            }
        }
    }
}

export default new SqlPlugin();
