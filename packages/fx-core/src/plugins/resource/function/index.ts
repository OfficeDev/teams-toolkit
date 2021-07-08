// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Func,
  FxError,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  SystemError,
  UserError,
  err,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";

import {
  DeploySteps,
  PostProvisionSteps,
  PreDeploySteps,
  ProvisionSteps,
  ScaffoldSteps,
  StepHelperFactory,
} from "./resources/steps";
import { ErrorType, FunctionPluginError } from "./resources/errors";
import { FunctionPluginImpl } from "./plugin";
import { FxResult, FunctionPluginResultFactory as ResultFactory } from "./result";
import { FunctionEvent } from "./enums";
import { Logger } from "./utils/logger";
import { TelemetryHelper } from "./utils/telemetry-helper";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  HostTypeOptionAzure,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import { injectable } from "inversify";

// This layer tries to provide a uniform exception handling for function plugin.
@injectable()
export class FunctionPlugin implements Plugin {
  name = "fx-resource-function";
  displayName = "Azure Function";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const cap = solutionSettings.capabilities!;
    const azureResources = solutionSettings.azureResources ? solutionSettings.azureResources : [];
    return (
      solutionSettings.hostType === HostTypeOptionAzure.id &&
      cap.includes(TabOptionItem.id) &&
      (azureResources.includes(AzureResourceSQL.id) ||
        azureResources.includes(AzureResourceApim.id) ||
        azureResources.includes(AzureResourceFunction.id))
    );
  }

  functionPluginImpl: FunctionPluginImpl = new FunctionPluginImpl();

  public async callFunc(func: Func, ctx: PluginContext): Promise<FxResult> {
    return await this.functionPluginImpl.callFunc(func, ctx);
  }

  setContext(ctx: PluginContext) {
    Logger.setLogger(ctx.logProvider);
    TelemetryHelper.setContext(ctx);
  }

  public async getQuestionsForUserTask(
    func: Func,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    this.setContext(ctx);
    const res = await this.runWithErrorWrapper(
      ctx,
      FunctionEvent.getQuestions,
      () => Promise.resolve(this.functionPluginImpl.getQuestionsForUserTask(func, ctx)),
      false
    );
    return res;
  }

  public async preScaffold(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.preScaffold, () =>
      this.functionPluginImpl.preScaffold(ctx)
    );
    return res;
  }

  public async scaffold(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    await StepHelperFactory.scaffoldStepHelper.start(Object.entries(ScaffoldSteps).length, ctx.ui);
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.scaffold, () =>
      this.functionPluginImpl.scaffold(ctx)
    );
    await StepHelperFactory.scaffoldStepHelper.end();
    return res;
  }

  public async preProvision(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.preProvision, () =>
      this.functionPluginImpl.preProvision(ctx)
    );
    return res;
  }

  public async provision(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    await StepHelperFactory.provisionStepHelper.start(
      Object.entries(ProvisionSteps).length,
      ctx.ui
    );
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.provision, () =>
      this.functionPluginImpl.provision(ctx)
    );
    await StepHelperFactory.provisionStepHelper.end();
    return res;
  }

  public async postProvision(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    await StepHelperFactory.postProvisionStepHelper.start(
      Object.entries(PostProvisionSteps).length,
      ctx.ui
    );
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.postProvision, () =>
      this.functionPluginImpl.postProvision(ctx)
    );
    await StepHelperFactory.postProvisionStepHelper.end();
    return res;
  }

  public async preDeploy(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    await StepHelperFactory.preDeployStepHelper.start(
      Object.entries(PreDeploySteps).length,
      ctx.ui
    );
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.preDeploy, () =>
      this.functionPluginImpl.preDeploy(ctx)
    );
    await StepHelperFactory.preDeployStepHelper.end();
    return res;
  }

  public async deploy(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    await StepHelperFactory.deployStepHelper.start(Object.entries(DeploySteps).length, ctx.ui);
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.deploy, () =>
      this.functionPluginImpl.deploy(ctx)
    );
    await StepHelperFactory.deployStepHelper.end();
    return res;
  }

  private async runWithErrorWrapper(
    ctx: PluginContext,
    event: FunctionEvent,
    fn: () => Promise<FxResult>,
    sendTelemetry = true
  ): Promise<FxResult> {
    try {
      sendTelemetry && TelemetryHelper.sendStartEvent(event);
      const res: FxResult = await fn();
      sendTelemetry && TelemetryHelper.sendResultEvent(event, res);
      return res;
    } catch (e) {
      if (e instanceof UserError || e instanceof SystemError) {
        const res = err(e);
        sendTelemetry && TelemetryHelper.sendResultEvent(event, res);
        return res;
      }

      if (e instanceof FunctionPluginError) {
        const res =
          e.errorType === ErrorType.User
            ? ResultFactory.UserError(e.getMessage(), e.code, undefined, e, e.stack)
            : ResultFactory.SystemError(e.getMessage(), e.code, undefined, e, e.stack);
        sendTelemetry && TelemetryHelper.sendResultEvent(event, res);
        return res;
      }

      const UnhandledErrorCode = "UnhandledError";
      /* Never send unhandled error message for privacy concern. */
      sendTelemetry &&
        TelemetryHelper.sendResultEvent(
          event,
          ResultFactory.SystemError("Got an unhandled error", UnhandledErrorCode)
        );
      return ResultFactory.SystemError(e.message, UnhandledErrorCode, undefined, e, e.stack);
    }
  }
}

export default new FunctionPlugin();
