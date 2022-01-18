// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  err,
  UserError,
  SystemError,
  AzureSolutionSettings,
  v2,
  TokenProvider,
  FxError,
  Result,
  Inputs,
  Json,
  Func,
  ok,
} from "@microsoft/teamsfx-api";

import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { CICDImpl } from "./plugin";
import { ErrorType, PluginError } from "./errors";
import { Logger } from "./logger";
import { telemetryHelper } from "./utils/telemetry-helper";
import { LifecycleFuncNames } from "./constants";
import { Service } from "typedi";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { ResourcePlugin, Context } from "@microsoft/teamsfx-api/build/v2";

@Service(ResourcePluginsV2.CICDPlugin)
export class CICDPluginV2 implements ResourcePlugin {
  name = "fx-resource-cicd";
  displayName = "CICD";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activate(solutionSettings: AzureSolutionSettings): boolean {
    return true;
  }

  public cicdImpl: CICDImpl = new CICDImpl();

  public async addCICDWorkflows(context: Context): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await this.runWithExceptionCatching(
      context,
      () => this.cicdImpl.addCICDWorkflows(context),
      true,
      LifecycleFuncNames.ADD_CICD_WORKFLOWS
    );

    return result;
  }

  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<unknown, FxError>> {
    if (func.method === "addCICDWorkflows") {
      return await this.runWithExceptionCatching(
        ctx,
        () => this.cicdImpl.addCICDWorkflows(ctx),
        true,
        LifecycleFuncNames.ADD_CICD_WORKFLOWS
      );
    }
    return ok(undefined);
  }

  private async runWithExceptionCatching(
    context: Context,
    fn: () => Promise<FxResult>,
    sendTelemetry: boolean,
    name: string
  ): Promise<FxResult> {
    try {
      sendTelemetry && telemetryHelper.sendStartEvent(context, name);
      const res: FxResult = await fn();
      sendTelemetry && telemetryHelper.sendResultEvent(context, name, res);
      return res;
    } catch (e) {
      if (e instanceof UserError || e instanceof SystemError) {
        const res = err(e);
        sendTelemetry && telemetryHelper.sendResultEvent(context, name, res);
        return res;
      }

      if (e instanceof PluginError) {
        const result =
          e.errorType === ErrorType.System
            ? ResultFactory.SystemError(e.name, e.genMessage(), e.innerError)
            : ResultFactory.UserError(e.name, e.genMessage(), e.showHelpLink, e.innerError);
        sendTelemetry && telemetryHelper.sendResultEvent(context, name, result);
        return result;
      } else {
        // Unrecognized Exception.
        const UnhandledErrorCode = "UnhandledError";
        sendTelemetry &&
          telemetryHelper.sendResultEvent(
            context,
            name,
            ResultFactory.SystemError("Got an unhandled error", UnhandledErrorCode)
          );
        return ResultFactory.SystemError(UnhandledErrorCode, e.message, e);
      }
    }
  }
}

export default new CICDPluginV2();
