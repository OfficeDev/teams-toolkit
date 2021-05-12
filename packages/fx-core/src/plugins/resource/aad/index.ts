// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Plugin,
  PluginContext,
  SystemError,
  UserError,
  err,
} from "@microsoft/teamsfx-api";
import { AadAppForTeamsImpl } from "./plugin";
import { AadResult, ResultFactory } from "./results";
import { UnhandledError } from "./errors";
import { TelemetryUtils } from "./utils/telemetry";
import { DialogUtils } from "./utils/dialog";
import { Messages, Telemetry } from "./constants";

export class AadAppForTeamsPlugin implements Plugin {
  public pluginImpl: AadAppForTeamsImpl = new AadAppForTeamsImpl();

  public async provision(ctx: PluginContext): Promise<AadResult> {
    return await this.runWithExceptionCatchingAsync(
      () => this.pluginImpl.provision(ctx),
      ctx,
      Messages.EndProvision.telemetry,
    );
  }

  public async localDebug(ctx: PluginContext): Promise<AadResult> {
    return await this.runWithExceptionCatchingAsync(
      () => this.pluginImpl.provision(ctx, true),
      ctx,
      Messages.EndLocalDebug.telemetry,
    );
  }

  public setApplicationInContext(
    ctx: PluginContext,
    isLocalDebug = false
  ): AadResult {
    return this.runWithExceptionCatching(
      () => this.pluginImpl.setApplicationInContext(ctx, isLocalDebug),
      ctx,
    );
  }

  public async postProvision(ctx: PluginContext): Promise<AadResult> {
    return await this.runWithExceptionCatchingAsync(
      () => this.pluginImpl.postProvision(ctx),
      ctx,
      Messages.EndPostProvision.telemetry,
    );
  }

  public async postLocalDebug(ctx: PluginContext): Promise<AadResult> {
    return await this.runWithExceptionCatchingAsync(
      () => this.pluginImpl.postProvision(ctx, true),
      ctx,
      Messages.EndPostLocalDebug.telemetry,
    );
  }

  private async runWithExceptionCatchingAsync(
    fn: () => Promise<AadResult>,
    ctx: PluginContext,
    stage: string,
  ): Promise<AadResult> {
    try {
      return await fn();
    } catch (e) {
      return this.returnError(e, ctx, stage);
    }
  }

  private runWithExceptionCatching(
    fn: () => AadResult,
    ctx: PluginContext,
  ): AadResult {
    try {
      return fn();
    } catch (e) {
      return this.returnError(e, ctx, "");
    }
  }

  private returnError(e: any, ctx: PluginContext, stage: string): AadResult {
    if (e instanceof SystemError || e instanceof UserError) {
      ctx.logProvider?.error(e.message);
      if (e.innerError) {
        let innerErrorMessage = `Detailed error: ${e.innerError.message}.`;
        if (e.innerError.response?.data?.errorMessage) {
          innerErrorMessage += ` Reason: ${e.innerError.response?.data?.errorMessage}`;
        }
        ctx.logProvider?.error(innerErrorMessage);
      }
      TelemetryUtils.init(ctx);
      TelemetryUtils.sendErrorEvent(stage, e.name, e instanceof UserError ? Telemetry.userError : Telemetry.systemError, e.message );
      DialogUtils.progress?.end();
      return err(e);
    } else {
      if (!(e instanceof Error)) {
        e = new Error(e.toString());
      }

      ctx.logProvider?.error(e.message);
      TelemetryUtils.init(ctx);
      TelemetryUtils.sendErrorEvent(stage, UnhandledError.name, Telemetry.systemError, UnhandledError.message());
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
