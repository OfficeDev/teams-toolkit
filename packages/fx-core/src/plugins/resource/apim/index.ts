// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Plugin,
  FxError,
  PluginContext,
  SystemError,
  UserError,
  Result,
  err,
  ok,
  QTreeNode,
  Stage,
  Func,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { AssertNotEmpty, BuildError, NotImplemented, UnhandledError } from "./error";
import { Telemetry } from "./utils/telemetry";
import { AadPluginConfig, ApimPluginConfig, FunctionPluginConfig, SolutionConfig } from "./config";
import {
  AadDefaultValues,
  PluginLifeCycle,
  PluginLifeCycleToProgressStep,
  ProgressMessages,
  ProgressStep,
  ProjectConstants,
  OperationStatus,
  UserTask,
  ApimPluginConfigKeys,
} from "./constants";
import { Factory } from "./factory";
import { ProgressBar } from "./utils/progressBar";
import { buildAnswer } from "./answer";
import { AzureResourceApim } from "../../solution/fx-solution/question";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import "./v2";
import { ArmTemplateResult } from "../../../common/armInterface";

@Service(ResourcePlugins.ApimPlugin)
export class ApimPlugin implements Plugin {
  name = "fx-resource-apim";
  displayName = "API Management";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const azureResources = solutionSettings.azureResources ? solutionSettings.azureResources : [];
    return azureResources.includes(AzureResourceApim.id);
  }
  private progressBar: ProgressBar = new ProgressBar();

  public async getQuestions(
    stage: Stage,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await this.executeWithFxError(PluginLifeCycle.GetQuestions, _getQuestions, ctx, stage);
  }

  public async getQuestionsForUserTask(
    func: Func,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return await this.executeWithFxError(
      PluginLifeCycle.GetQuestionsForUserTask,
      _getQuestionsForUserTask,
      ctx,
      func
    );
  }

  public async callFunc(func: Func, ctx: PluginContext): Promise<Result<any, FxError>> {
    return await this.executeWithFxError(PluginLifeCycle.CallFunc, _callFunc, ctx, func);
  }

  public async scaffold(ctx: PluginContext): Promise<Result<any, FxError>> {
    return await this.executeWithFxError(PluginLifeCycle.Scaffold, _scaffold, ctx);
  }

  public async generateArmTemplates(
    ctx: PluginContext
  ): Promise<Result<ArmTemplateResult, FxError>> {
    return await this.executeWithFxError(
      PluginLifeCycle.GenerateArmTemplates,
      _generateArmTemplates,
      ctx
    );
  }

  public async provision(ctx: PluginContext): Promise<Result<any, FxError>> {
    return await this.executeWithFxError(PluginLifeCycle.Provision, _provision, ctx);
  }

  public async postProvision(ctx: PluginContext): Promise<Result<any, FxError>> {
    return await this.executeWithFxError(PluginLifeCycle.PostProvision, _postProvision, ctx);
  }

  public async deploy(ctx: PluginContext): Promise<Result<any, FxError>> {
    return await this.executeWithFxError(PluginLifeCycle.Deploy, _deploy, ctx);
  }

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<Result<any, FxError>> {
    if (func.method === UserTask.addResourceFuncName) {
      return await this.executeWithFxError(PluginLifeCycle.Scaffold, _scaffold, ctx);
    }
    return err(BuildError(NotImplemented));
  }

  private async executeWithFxError<T>(
    lifeCycle: PluginLifeCycle,
    fn: (ctx: PluginContext, progressBar: ProgressBar, ...params: any[]) => Promise<T>,
    ctx: PluginContext,
    ...params: any[]
  ): Promise<Result<T, FxError>> {
    try {
      await this.progressBar.init(PluginLifeCycleToProgressStep[lifeCycle], ctx);
      Telemetry.sendLifeCycleEvent(
        ctx.telemetryReporter,
        ctx.envInfo,
        lifeCycle,
        OperationStatus.Started
      );
      const result = await fn(ctx, this.progressBar, ...params);
      Telemetry.sendLifeCycleEvent(
        ctx.telemetryReporter,
        ctx.envInfo,
        lifeCycle,
        OperationStatus.Succeeded
      );
      await this.progressBar.close(PluginLifeCycleToProgressStep[lifeCycle], true);
      return ok(result);
    } catch (error: any) {
      let packagedError: SystemError | UserError;
      if (error instanceof SystemError || error instanceof UserError) {
        packagedError = error;
      } else if (error instanceof Error) {
        packagedError = BuildError(UnhandledError, error);
      } else {
        packagedError = BuildError(UnhandledError);
      }

      ctx.logProvider?.error(`[${ProjectConstants.pluginDisplayName}] ${error.message}`);
      Telemetry.sendLifeCycleEvent(
        ctx.telemetryReporter,
        ctx.envInfo,
        lifeCycle,
        OperationStatus.Failed,
        packagedError
      );
      await this.progressBar.close(PluginLifeCycleToProgressStep[lifeCycle], false);
      return err(packagedError);
    }
  }
}

async function _getQuestions(
  ctx: PluginContext,
  progressBar: ProgressBar,
  stage: Stage
): Promise<QTreeNode | undefined> {
  const apimConfig = new ApimPluginConfig(ctx.config, ctx.envInfo.envName);
  const questionManager = await Factory.buildQuestionManager(ctx);
  switch (stage) {
    case Stage.deploy:
      return await questionManager.deploy(ctx, apimConfig);
    default:
      return undefined;
  }
}

async function _getQuestionsForUserTask(
  ctx: PluginContext,
  progressBar: ProgressBar,
  func: Func
): Promise<QTreeNode | undefined> {
  const apimConfig = new ApimPluginConfig(ctx.config, ctx.envInfo.envName);
  const questionManager = await Factory.buildQuestionManager(ctx);
  if (func.method === "addResource") {
    return await questionManager.addResource(ctx, apimConfig);
  }
  return undefined;
}

async function _callFunc(ctx: PluginContext, progressBar: ProgressBar, func: Func): Promise<any> {
  const questionManager = await Factory.buildQuestionManager(ctx);
  return await questionManager.callFunc(func, ctx);
}

async function _scaffold(ctx: PluginContext, progressBar: ProgressBar): Promise<void> {
  const apimConfig = new ApimPluginConfig(ctx.config, ctx.envInfo.envName);
  const answer = buildAnswer(ctx.answers);
  const scaffoldManager = await Factory.buildScaffoldManager(ctx);

  const appName = AssertNotEmpty("projectSettings.appName", ctx?.projectSettings?.appName);

  if (answer.validate) {
    await answer.validate(PluginLifeCycle.Scaffold, apimConfig, ctx.root);
  }

  answer.save(PluginLifeCycle.Scaffold, apimConfig);

  await progressBar.next(ProgressStep.Scaffold, ProgressMessages[ProgressStep.Scaffold].Scaffold);
  await scaffoldManager.scaffold(appName, ctx.root);
}

async function _provision(ctx: PluginContext, progressBar: ProgressBar): Promise<void> {
  const solutionConfig = new SolutionConfig(ctx.envInfo);
  const apimConfig = new ApimPluginConfig(ctx.config, ctx.envInfo.envName);

  const apimManager = await Factory.buildApimManager(ctx);
  const aadManager = await Factory.buildAadManager(ctx);

  const appName = AssertNotEmpty("projectSettings.appName", ctx?.projectSettings?.appName);

  await progressBar.next(
    ProgressStep.Provision,
    ProgressMessages[ProgressStep.Provision].CreateApim
  );
  await apimManager.provision(apimConfig, solutionConfig, appName);

  await progressBar.next(
    ProgressStep.Provision,
    ProgressMessages[ProgressStep.Provision].CreateAad
  );
  await aadManager.provision(apimConfig, appName);
}

async function _generateArmTemplates(
  ctx: PluginContext,
  progressBar: ProgressBar
): Promise<ArmTemplateResult> {
  const apimManager = await Factory.buildApimManager(ctx);
  return await apimManager.generateArmTemplates();
}

async function _postProvision(ctx: PluginContext, progressBar: ProgressBar): Promise<void> {
  const apimConfig = new ApimPluginConfig(ctx.config, ctx.envInfo.envName);
  const aadConfig = new AadPluginConfig(ctx.envInfo);

  const apimManager = await Factory.buildApimManager(ctx);
  const aadManager = await Factory.buildAadManager(ctx);
  const teamsAppAadManager = await Factory.buildTeamsAppAadManager(ctx);

  const appName = AssertNotEmpty("projectSettings.appName", ctx?.projectSettings?.appName);

  await progressBar.next(
    ProgressStep.PostProvision,
    ProgressMessages[ProgressStep.PostProvision].ConfigClientAad
  );
  await aadManager.postProvision(apimConfig, aadConfig, AadDefaultValues.redirectUris);

  await progressBar.next(
    ProgressStep.PostProvision,
    ProgressMessages[ProgressStep.PostProvision].ConfigApim
  );
  await apimManager.postProvision(apimConfig, ctx, aadConfig, appName);

  await progressBar.next(
    ProgressStep.PostProvision,
    ProgressMessages[ProgressStep.PostProvision].ConfigAppAad
  );
  await teamsAppAadManager.postProvision(aadConfig, apimConfig);

  // Delete user sensitive configuration
  ctx.config.delete(ApimPluginConfigKeys.publisherEmail);
  ctx.config.delete(ApimPluginConfigKeys.publisherName);
}

async function _deploy(ctx: PluginContext, progressBar: ProgressBar): Promise<void> {
  const solutionConfig = new SolutionConfig(ctx.envInfo);
  const apimConfig = new ApimPluginConfig(ctx.config, ctx.envInfo.envName);
  const functionConfig = new FunctionPluginConfig(ctx.envInfo);
  const answer = buildAnswer(ctx.answers);

  if (answer.validate) {
    await answer.validate(PluginLifeCycle.Deploy, apimConfig, ctx.root);
  }

  answer.save(PluginLifeCycle.Deploy, apimConfig);

  const apimManager = await Factory.buildApimManager(ctx);

  await progressBar.next(ProgressStep.Deploy, ProgressMessages[ProgressStep.Deploy].ImportApi);
  await apimManager.deploy(apimConfig, solutionConfig, functionConfig, answer, ctx.root);
}

export default new ApimPlugin();
