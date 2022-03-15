// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  err,
  Func,
  FxError,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import {
  AzureResourceFunction,
  HostTypeOptionAzure,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { FunctionEvent } from "./enums";
import { FunctionPluginImpl } from "./plugin";
import { ErrorType, FunctionPluginError } from "./resources/errors";
import {
  DeploySteps,
  PostProvisionSteps,
  PreDeploySteps,
  ProvisionSteps,
  ScaffoldSteps,
  StepHelperFactory,
} from "./resources/steps";
import { FunctionPluginResultFactory as ResultFactory, FxResult } from "./result";
import { Logger } from "./utils/logger";
import { TelemetryHelper } from "./utils/telemetry-helper";
import "./v2";
import "./v3";
@Service(ResourcePlugins.FunctionPlugin)
export class FunctionPlugin implements Plugin {
  name = "fx-resource-function";
  displayName = "Azure Function";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const azureResources = solutionSettings.azureResources || [];
    return (
      solutionSettings.hostType === HostTypeOptionAzure.id &&
      azureResources.includes(AzureResourceFunction.id)
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

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.executeUserTask, () =>
      this.functionPluginImpl.executeUserTask(func, ctx)
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
    await StepHelperFactory.scaffoldStepHelper.end(res.isOk());
    return res;
  }

  public async preProvision(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    return ResultFactory.Success();
  }

  public async provision(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    return ResultFactory.Success();
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
    await StepHelperFactory.postProvisionStepHelper.end(res.isOk());
    return res;
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.updateArmTemplates, () =>
      this.functionPluginImpl.updateArmTemplates(ctx)
    );
    return res;
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.generateArmTemplates, () =>
      this.functionPluginImpl.generateArmTemplates(ctx)
    );
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
    await StepHelperFactory.preDeployStepHelper.end(res.isOk());
    return res;
  }

  public async deploy(ctx: PluginContext): Promise<FxResult> {
    this.setContext(ctx);
    await StepHelperFactory.deployStepHelper.start(Object.entries(DeploySteps).length, ctx.ui);
    const res = await this.runWithErrorWrapper(ctx, FunctionEvent.deploy, () =>
      this.functionPluginImpl.deploy(ctx)
    );
    await StepHelperFactory.deployStepHelper.end(res.isOk());
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
