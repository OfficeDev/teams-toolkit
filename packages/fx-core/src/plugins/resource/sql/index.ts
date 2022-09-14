// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  ok,
  err,
  FxError,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  Stage,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { AzureResourceSQL, HostTypeOptionAzure } from "../../solution/fx-solution/question";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { Constants, Telemetry } from "./constants";
import { ErrorMessage } from "./errors";
import { SqlPluginImpl } from "./plugin";
import { SqlResult, SqlResultFactory } from "./results";
import { DialogUtils } from "./utils/dialogUtils";
import { TelemetryUtils } from "./utils/telemetryUtils";
import "./v2";
@Service(ResourcePlugins.SqlPlugin)
export class SqlPlugin implements Plugin {
  name = "fx-resource-azure-sql";
  displayName = "Azure SQL Database";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const azureResources = solutionSettings.azureResources || [];
    return (
      solutionSettings.hostType === HostTypeOptionAzure.id &&
      azureResources.includes(AzureResourceSQL.id)
    );
  }
  sqlImpl = new SqlPluginImpl();

  public async preProvision(ctx: PluginContext): Promise<SqlResult> {
    return this.runWithSqlError(
      Telemetry.stage.preProvision,
      () => this.sqlImpl.preProvision(ctx),
      ctx
    );
  }

  public async provision(ctx: PluginContext): Promise<SqlResult> {
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<SqlResult> {
    return this.runWithSqlError(
      Telemetry.stage.postProvision,
      () => this.sqlImpl.postProvision(ctx),
      ctx
    );
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<SqlResult> {
    return this.runWithSqlError(
      Telemetry.stage.updateArmTemplates,
      () => this.sqlImpl.updateArmTemplates(ctx),
      ctx
    );
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<SqlResult> {
    let handleFunction: (ctx: PluginContext) => Promise<Result<any, FxError>>;
    if (ctx.answers?.existingResources?.includes(Constants.pluginFullName)) {
      handleFunction = this.sqlImpl.generateNewDatabaseBicepSnippet;
    } else {
      handleFunction = this.sqlImpl.generateArmTemplates;
    }
    return this.runWithSqlError(
      Telemetry.stage.generateArmTemplates,
      () => handleFunction(ctx),
      ctx
    );
  }

  public async getQuestions(
    stage: Stage,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return this.runWithSqlError(
      Telemetry.stage.getQuestion,
      () => this.sqlImpl.getQuestions(stage, ctx),
      ctx
    );
  }

  private async runWithSqlError(
    stage: string,
    fn: () => Promise<SqlResult>,
    ctx: PluginContext
  ): Promise<SqlResult> {
    try {
      return await fn();
    } catch (e) {
      await DialogUtils.progressBar?.end(false);

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
        res = err(
          SqlResultFactory.SystemError(
            ErrorMessage.UnhandledError.name,
            ErrorMessage.UnhandledError.message(),
            e
          )
        );
      }
      const errorCode = res.error.source + "." + res.error.name;
      const errorType =
        res.error instanceof SystemError ? Telemetry.systemError : Telemetry.userError;
      TelemetryUtils.init(ctx.telemetryReporter);
      let errorMessage = res.error.message;
      if (res.error.innerError) {
        errorMessage += ` Detailed error: ${res.error.innerError.message}.`;
      }
      TelemetryUtils.sendErrorEvent(stage, errorCode, errorType, errorMessage);
      return res;
    }
  }
}

export default new SqlPlugin();
