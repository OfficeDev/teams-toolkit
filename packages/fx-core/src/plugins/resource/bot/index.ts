// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  Func,
  FxError,
  Inputs,
  ok,
  Platform,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";

import { FxResult } from "./result";
import { TeamsBotImpl } from "./plugin";
import { ProgressBarFactory } from "./progressBars";
import { CustomizedTasks, LifecycleFuncNames, ProgressBarConstants } from "./constants";
import { runWithExceptionCatching } from "./errors";
import { Logger } from "./logger";
import { BotOptionItem, MessageExtensionItem } from "../../solution";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import "./v2";
import "./v3";
import { DotnetBotImpl } from "./dotnet/plugin";
import { PluginImpl } from "./interface";
import {
  isVSProject,
  BotHostTypes,
  isBotNotificationEnabled,
  isCLIDotNetEnabled,
} from "../../../common";
import { FunctionsHostedBotImpl } from "./functionsHostedBot/plugin";
import { ScaffoldConfig } from "./configs/scaffoldConfig";
import { createHostTypeTriggerQuestion, showNotificationTriggerCondition } from "./question";
import { CoreQuestionNames } from "../../../core/question";

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

  /**
   * @param isScaffold true for `scaffold` lifecycle, false otherwise.
   * @param context context of plugin
   */
  public getImpl(context: PluginContext, isScaffold = false): PluginImpl {
    if (isVSProject(context.projectSettings)) {
      return this.dotnetBotImpl;
    } else if (TeamsBot.isFunctionsHostedBot(context, isScaffold)) {
      return this.functionsBotImpl;
    } else {
      return this.teamsBotImpl;
    }
  }

  public async scaffold(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await runWithExceptionCatching(
      context,
      () => this.getImpl(context, true).scaffold(context),
      true,
      LifecycleFuncNames.SCAFFOLD
    );

    await ProgressBarFactory.closeProgressBar(result.isOk(), ProgressBarConstants.SCAFFOLD_TITLE);

    return result;
  }

  public async preProvision(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await runWithExceptionCatching(
      context,
      () => this.getImpl(context).preProvision(context),
      true,
      LifecycleFuncNames.PRE_PROVISION
    );
  }

  public async provision(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await runWithExceptionCatching(
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

    return await runWithExceptionCatching(
      context,
      () => this.getImpl(context).postProvision(context),
      true,
      LifecycleFuncNames.POST_PROVISION
    );
  }

  public async updateArmTemplates(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await runWithExceptionCatching(
      context,
      () => this.getImpl(context).updateArmTemplates(context),
      true,
      LifecycleFuncNames.GENERATE_ARM_TEMPLATES
    );
  }

  public async generateArmTemplates(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await runWithExceptionCatching(
      context,
      () => this.getImpl(context).generateArmTemplates(context),
      true,
      LifecycleFuncNames.GENERATE_ARM_TEMPLATES
    );
  }

  public async preDeploy(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    return await runWithExceptionCatching(
      context,
      () => this.getImpl(context).preDeploy(context),
      true,
      LifecycleFuncNames.PRE_DEPLOY
    );
  }

  public async deploy(context: PluginContext): Promise<FxResult> {
    Logger.setLogger(context.logProvider);

    const result = await runWithExceptionCatching(
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

    const result = await runWithExceptionCatching(
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

    return await runWithExceptionCatching(
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
      return await runWithExceptionCatching(
        context,
        async () => {
          const inputs = context.answers as Inputs;
          const res = new QTreeNode({
            type: "group",
          });
          if (inputs.platform === Platform.CLI && isCLIDotNetEnabled()) {
            const dotnetNode = new QTreeNode(createHostTypeTriggerQuestion(Platform.CLI, "dotnet"));
            dotnetNode.condition = {
              validFunc: async (input: unknown, inputs?: Inputs) => {
                if (inputs && inputs[CoreQuestionNames.Runtime] === "dotnet") {
                  return undefined;
                } else {
                  return "Runtime is not .net.";
                }
              },
            };
            res.addChild(dotnetNode);
            const nodejsNode = new QTreeNode(createHostTypeTriggerQuestion(Platform.CLI, "nodejs"));
            nodejsNode.condition = {
              validFunc: async (input: unknown, inputs?: Inputs) => {
                if (inputs && inputs[CoreQuestionNames.Runtime] === "nodejs") {
                  return undefined;
                } else {
                  return "Runtime is not node.js";
                }
              },
            };
            res.addChild(nodejsNode);
          } else {
            res.addChild(
              new QTreeNode(
                createHostTypeTriggerQuestion(inputs.platform, inputs[CoreQuestionNames.Runtime])
              )
            );
          }
          res.condition = showNotificationTriggerCondition;
          return ok(res);
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

    return await runWithExceptionCatching(
      context,
      async () => {
        if (
          (func.method === CustomizedTasks.addCapability ||
            func.method === CustomizedTasks.addFeature) &&
          isBotNotificationEnabled()
        ) {
          const res = new QTreeNode({
            type: "group",
          });
          res.addChild(new QTreeNode(createHostTypeTriggerQuestion(context.answers?.platform)));
          res.condition = showNotificationTriggerCondition;
          return ok(res);
        } else {
          return ok(undefined);
        }
      },
      true,
      LifecycleFuncNames.GET_QUETSIONS_FOR_USER_TASK
    );
  }

  private static isFunctionsHostedBot(context: PluginContext, isScaffold: boolean): boolean {
    return ScaffoldConfig.getBotHostType(context, isScaffold) === BotHostTypes.AzureFunctions;
  }
}

export default new TeamsBot();
