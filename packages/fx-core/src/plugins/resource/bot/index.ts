// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Plugin,
  PluginContext,
  Result,
  QTreeNode,
  Stage,
  FxError,
  err,
  UserError,
  SystemError,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";

import { FxResult, FxBotPluginResultFactory as ResultFactory } from "./result";
import { TeamsBotImpl } from "./plugin";
import { ProgressBarFactory } from "./progressBars";
import { LifecycleFuncNames, ProgressBarConstants } from "./constants";
import { ErrorType, PluginError } from "./errors";
import { Logger } from "./logger";
import { telemetryHelper } from "./utils/telemetry-helper";
import { BotOptionItem, MessageExtensionItem } from "../../solution/fx-solution/question";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
@Service(ResourcePlugins.BotPlugin)
export class TeamsBot implements Plugin {
  name = "fx-resource-bot";
  displayName = "Bot";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const cap = solutionSettings.capabilities || [];
    return cap.includes(BotOptionItem.id) || cap.includes(MessageExtensionItem.id);
  }
  public teamsBotImpl: TeamsBotImpl = new TeamsBotImpl();

  public async getQuestions(
    stage: Stage,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return this.teamsBotImpl.getQuestions(stage, ctx);
  }

  public async preScaffold(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.preScaffold(context),
      true,
      LifecycleFuncNames.PRE_SCAFFOLD
    );
  }

  public async scaffold(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.scaffold(context),
      true,
      LifecycleFuncNames.SCAFFOLD
    );

    await ProgressBarFactory.closeProgressBar(ProgressBarConstants.SCAFFOLD_TITLE);

    return result;
  }

  public async preProvision(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.preProvision(context),
      true,
      LifecycleFuncNames.PRE_PROVISION
    );
  }

  public async provision(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.provision(context),
      true,
      LifecycleFuncNames.PROVISION
    );

    await ProgressBarFactory.closeProgressBar(ProgressBarConstants.PROVISION_TITLE);

    return result;
  }

  public async postProvision(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.postProvision(context),
      true,
      LifecycleFuncNames.POST_PROVISION
    );
  }

  public async preDeploy(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.preDeploy(context),
      true,
      LifecycleFuncNames.PRE_DEPLOY
    );
  }

  public async deploy(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.deploy(context),
      true,
      LifecycleFuncNames.DEPLOY
    );

    await ProgressBarFactory.closeProgressBar(ProgressBarConstants.DEPLOY_TITLE);

    return result;
  }

  public async localDebug(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.localDebug(context),
      false,
      LifecycleFuncNames.LOCAL_DEBUG
    );

    await ProgressBarFactory.closeProgressBar(ProgressBarConstants.LOCAL_DEBUG_TITLE);

    return result;
  }

  public async postLocalDebug(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await this.runWithExceptionCatching(
      context,
      () => this.teamsBotImpl.postLocalDebug(context),
      false,
      LifecycleFuncNames.POST_LOCAL_DEBUG
    );
  }

  private wrapError(
    e: any,
    context: PluginContext,
    sendTelemetry: boolean,
    name: string
  ): FxResult {
    if (e.innerError) {
      e.message += ` Detailed error: ${e.innerError.message}.`;
      if (e.innerError.response?.data?.errorMessage) {
        e.message += ` Reason: ${e.innerError.response?.data?.errorMessage}`;
      }
    }
    Logger.error(e.message);
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
          ResultFactory.SystemError(UnhandledErrorCode, `Got an unhandled error: ${e.message}`)
        );
      return ResultFactory.SystemError(UnhandledErrorCode, e.message, e);
    }
  }

  private async runWithExceptionCatching(
    context: PluginContext,
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
      await ProgressBarFactory.closeProgressBar(); // Close all progress bars.
      return this.wrapError(e, context, sendTelemetry, name);
    }
  }
}

export default new TeamsBot();
