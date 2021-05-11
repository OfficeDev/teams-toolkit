// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Plugin,
  PluginContext,
  Func,
  ok,
  SystemError,
  UserError,
  err,
  Result,
  QTreeNode,
  FxError,
} from "@microsoft/teamsfx-api";
import { AadAppForTeamsImpl } from "./plugin";
import { AadResult, ResultFactory } from "./results";
import { UnhandledError } from "./errors";
import { TelemetryUtils } from "./utils/telemetry";
import { DialogUtils } from "./utils/dialog";

export class AadAppForTeamsPlugin implements Plugin {
  public pluginImpl: AadAppForTeamsImpl = new AadAppForTeamsImpl();

  public async provision(ctx: PluginContext): Promise<AadResult> {
    return await this.runWithExceptionCatchingAsync(
      () => this.pluginImpl.provision(ctx),
      ctx
    );
  }

  public async localDebug(ctx: PluginContext): Promise<AadResult> {
    return await this.runWithExceptionCatchingAsync(
      () => this.pluginImpl.provision(ctx, true),
      ctx
    );
  }

  public setApplicationInContext(
    ctx: PluginContext,
    isLocalDebug = false
  ): AadResult {
    return this.runWithExceptionCatching(
      () => this.pluginImpl.setApplicationInContext(ctx, isLocalDebug),
      ctx
    );
  }

  public async postProvision(ctx: PluginContext): Promise<AadResult> {
    return await this.runWithExceptionCatchingAsync(
      () => this.pluginImpl.postProvision(ctx),
      ctx
    );
  }

  public async postLocalDebug(ctx: PluginContext): Promise<AadResult> {
    return await this.runWithExceptionCatchingAsync(
      () => this.pluginImpl.postProvision(ctx, true),
      ctx
    );
  }

  public async executeUserTask(
    func: Func,
    ctx: PluginContext
  ): Promise<AadResult> {
    if (func.method === "aadUpdatePermission") {
      return await this.runWithExceptionCatchingAsync(
        () => this.pluginImpl.updatePermission(ctx),
        ctx
      );
    }

    return ok(undefined);
  }

  public async getQuestionsForUserTask(
    func: Func,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await this.pluginImpl.getQuestionsForUserTask(func, ctx);
  }

  private async runWithExceptionCatchingAsync(
    fn: () => Promise<AadResult>,
    ctx: PluginContext
  ): Promise<AadResult> {
    try {
      return await fn();
    } catch (e) {
      return this.returnError(e, ctx);
    }
  }

  private runWithExceptionCatching(
    fn: () => AadResult,
    ctx: PluginContext
  ): AadResult {
    try {
      return fn();
    } catch (e) {
      return this.returnError(e, ctx);
    }
  }

  private returnError(e: any, ctx: PluginContext): AadResult {
    if (e instanceof SystemError || e instanceof UserError) {
      ctx.logProvider?.error(e.message);
      if (e.innerError) {
        ctx.logProvider?.error(`Detailed error: ${e.innerError.message}`);
      }
      TelemetryUtils.init(ctx);
      TelemetryUtils.sendException(e);
      DialogUtils.progress?.end();
      return err(e);
    } else {
      if (!(e instanceof Error)) {
        e = new Error(e.toString());
      }

      ctx.logProvider?.error(e.message);
      TelemetryUtils.init(ctx);
      TelemetryUtils.sendException(e);
      return err(
        ResultFactory.SystemError(
          UnhandledError.name,
          UnhandledError.message(),
          e,
          undefined,
          undefined
        )
      );
    }
  }
}
