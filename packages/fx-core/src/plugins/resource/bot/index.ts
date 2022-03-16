// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  err,
  Func,
  FxError,
  ok,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  Stage,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";

import { FxBotPluginResultFactory as ResultFactory, FxResult } from "./result";
import { TeamsBotImpl } from "./plugin";
import { ProgressBarFactory } from "./progressBars";
import { CustomizedTasks, LifecycleFuncNames, ProgressBarConstants } from "./constants";
import {
  ErrorType,
  InnerError,
  isErrorWithMessage,
  isHttpError,
  isPluginError,
  PluginError,
} from "./errors";
import { Logger } from "./logger";
import { telemetryHelper } from "./utils/telemetry-helper";
import { BotOptionItem, MessageExtensionItem } from "../../solution/fx-solution/question";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import "./v2";
import "./v3";
import { DotnetBotImpl } from "./dotnet/plugin";
import { PluginImpl } from "./interface";
import { isVSProject, BotHostTypes, isBotNotificationEnabled } from "../../../common";
import { FunctionsHostedBotImpl } from "./functionsHostedBot/plugin";
import { ScaffoldConfig } from "./configs/scaffoldConfig";
import { getLocalizedString } from "../../../common/localizeUtils";

@Service(ResourcePlugins.BotPlugin)
export class TeamsBot implements Plugin {
  name = "fx-resource-bot";
  displayName = "Bot";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const cap = solutionSettings.capabilities || [];
    return cap.includes(BotOptionItem.id) || cap.includes(MessageExtensionItem.id);
  }
  public teamsBotImpl: TeamsBotImpl = new TeamsBotImpl();
  public dotnetBotImpl: DotnetBotImpl = new DotnetBotImpl();
  public functionsBotImpl: FunctionsHostedBotImpl = new FunctionsHostedBotImpl();

  public getImpl(context: PluginContext): PluginImpl {
    if (isVSProject(context.projectSettings)) {
      return this.dotnetBotImpl;
    } else if (this.isFunctionsHostedBot(context)) {
      return this.functionsBotImpl;
    } else {
      return this.teamsBotImpl;
    }
  }

  public async scaffold(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).scaffold(context),
      true,
      LifecycleFuncNames.SCAFFOLD
    );

    await ProgressBarFactory.closeProgressBar(result.isOk(), ProgressBarConstants.SCAFFOLD_TITLE);

    return result;
  }

  public async preProvision(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).preProvision(context),
      true,
      LifecycleFuncNames.PRE_PROVISION
    );
  }

  public async provision(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).provision(context),
      true,
      LifecycleFuncNames.PROVISION
    );

    await ProgressBarFactory.closeProgressBar(result.isOk(), ProgressBarConstants.PROVISION_TITLE);

    return result;
  }

  public async postProvision(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).postProvision(context),
      true,
      LifecycleFuncNames.POST_PROVISION
    );
  }

  public async updateArmTemplates(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).updateArmTemplates(context),
      true,
      LifecycleFuncNames.GENERATE_ARM_TEMPLATES
    );
  }

  public async generateArmTemplates(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).generateArmTemplates(context),
      true,
      LifecycleFuncNames.GENERATE_ARM_TEMPLATES
    );
  }

  public async preDeploy(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).preDeploy(context),
      true,
      LifecycleFuncNames.PRE_DEPLOY
    );
  }

  public async deploy(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).deploy(context),
      true,
      LifecycleFuncNames.DEPLOY
    );

    await ProgressBarFactory.closeProgressBar(result.isOk(), ProgressBarConstants.DEPLOY_TITLE);

    return result;
  }

  public async localDebug(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).localDebug(context),
      false,
      LifecycleFuncNames.LOCAL_DEBUG
    );

    await ProgressBarFactory.closeProgressBar(
      result.isOk(),
      ProgressBarConstants.LOCAL_DEBUG_TITLE
    );

    return result;
  }

  public async postLocalDebug(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await TeamsBot.runWithExceptionCatching(
      context,
      () => this.getImpl(context).postLocalDebug(context),
      false,
      LifecycleFuncNames.POST_LOCAL_DEBUG
    );
  }

  public async getQuestions(
    stage: Stage,
    context: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    Logger.setLogger(context.logProvider);

    if (stage === Stage.create) {
      return await TeamsBot.runWithExceptionCatching(
        context,
        async () => {
          if (isBotNotificationEnabled()) {
            const res = new QTreeNode({
              type: "group",
            });
            // res.addChild(new QTreeNode(createHostTypeTriggerQuestion()));
            return ok(res);
          } else {
            return ok(undefined);
          }
        },
        true,
        LifecycleFuncNames.GET_QUETSIONS_FOR_SCAFFOLDING
      );
    } else {
      return ok(undefined);
    }
  }

  public async getQuestionsForUserTask(
    func: Func,
    context: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    Logger.setLogger(context.logProvider);

    return await TeamsBot.runWithExceptionCatching(
      context,
      async () => {
        if (func.method === CustomizedTasks.addCapability && isBotNotificationEnabled()) {
          const res = new QTreeNode({
            type: "group",
          });
          // res.addChild(new QTreeNode(createHostTypeTriggerQuestion()));
          return ok(res);
        } else {
          return ok(undefined);
        }
      },
      true,
      LifecycleFuncNames.GET_QUETSIONS_FOR_USER_TASK
    );
  }

  private static wrapError(
    e: InnerError,
    context: PluginContext,
    sendTelemetry: boolean,
    name: string
  ): FxResult {
    let errorMsg = isErrorWithMessage(e) ? e.message : "";
    const innerError = isPluginError(e) ? e.innerError : undefined;
    if (innerError) {
      errorMsg += getLocalizedString(
        "plugins.bot.DetailedError",
        isErrorWithMessage(innerError) ? innerError.message : ""
      );
      if (isHttpError(innerError)) {
        if (innerError.response?.data?.errorMessage) {
          errorMsg += getLocalizedString(
            "plugins.bot.DetailedErrorReason",
            innerError.response?.data?.errorMessage
          );
        } else if (innerError.response?.data?.error?.message) {
          // For errors return from Graph API
          errorMsg += getLocalizedString(
            "plugins.bot.DetailedErrorReason",
            innerError.response?.data?.error?.message
          );
        }
      }
    }
    Logger.error(errorMsg);
    if (e instanceof UserError || e instanceof SystemError) {
      const res = err(e);
      sendTelemetry && telemetryHelper.sendResultEvent(context, name, res);
      return res;
    }

    if (e instanceof PluginError) {
      const result =
        e.errorType === ErrorType.SYSTEM
          ? ResultFactory.SystemError(e.name, e.genMessage(), e.innerError)
          : ResultFactory.UserError(e.name, e.genMessage(), e.innerError, e.helpLink);
      sendTelemetry && telemetryHelper.sendResultEvent(context, name, result);
      return result;
    } else {
      // Unrecognized Exception.
      const UnhandledErrorCode = "UnhandledError";
      sendTelemetry &&
        telemetryHelper.sendResultEvent(
          context,
          name,
          ResultFactory.SystemError(
            UnhandledErrorCode,
            getLocalizedString("plugins.bot.UnhandledError", errorMsg),
            isPluginError(e) ? e.innerError : undefined
          )
        );
      return ResultFactory.SystemError(UnhandledErrorCode, errorMsg, innerError);
    }
  }

  private static async runWithExceptionCatching(
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
      await ProgressBarFactory.closeProgressBar(false); // Close all progress bars.
      return TeamsBot.wrapError(e, context, sendTelemetry, name);
    }
  }

  private isFunctionsHostedBot(context: PluginContext): boolean {
    return ScaffoldConfig.getBotHostType(context) === BotHostTypes.AzureFunctions;
  }
}

export default new TeamsBot();
