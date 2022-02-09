// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  AzureAccountProvider,
  AzureSolutionSettings,
  err,
  FxError,
  ok,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep, ConstantString } from "../../../../common/constants";
import { generateBicepFromFile } from "../../../../common/tools";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { getTemplatesFolder } from "../../../../folder";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  MessageExtensionItem,
} from "../../../solution/fx-solution/question";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { TeamsBotConfig } from "../configs/teamsBotConfig";
import { BotBicep, PathInfo, ProgressBarConstants, TemplateProjectsConstants } from "../constants";
import { SomethingMissingError } from "../errors";
import { LanguageStrategy } from "../languageStrategy";
import { ProgressBarFactory } from "../progressBars";
import { Messages } from "../resources/messages";
import fs from "fs-extra";
@Service(BuiltInFeaturePluginNames.bot)
export class NodeJSBotPluginV3 implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.bot;
  displayName = "NodeJS Bot";
  public config: TeamsBotConfig = new TeamsBotConfig();

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void | undefined, FxError>> {
    await this.config.restoreConfigFromContextV3(ctx, inputs);
    ctx.logProvider.info(Messages.ScaffoldingBot);

    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.SCAFFOLD_TITLE,
      ProgressBarConstants.SCAFFOLD_STEPS_NUM,
      ctx
    );
    await handler?.start(ProgressBarConstants.SCAFFOLD_STEP_START);

    // 1. Copy the corresponding template project into target directory.
    // Get group name.
    const group_name = TemplateProjectsConstants.GROUP_NAME_BOT_MSGEXT;
    if (!this.config.actRoles || this.config.actRoles.length === 0) {
      throw new SomethingMissingError("act roles");
    }

    await handler?.next(ProgressBarConstants.SCAFFOLD_STEP_FETCH_ZIP);
    await LanguageStrategy.getTemplateProject(group_name, this.config);

    // this.config.saveConfigIntoContextV3(envInfo); // scaffold will not persist state in envInfo
    ctx.logProvider.info(Messages.SuccessfullyScaffoldedBot);
    return ok(undefined);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    ctx.logProvider.info(Messages.GeneratingArmTemplatesBot);
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    const pluginCtx = { plugins: solutionSettings ? solutionSettings.activeResourcePlugins : [] };
    const bicepTemplateDir = path.join(getTemplatesFolder(), PathInfo.BicepTemplateRelativeDir);
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ProvisionModuleTemplateFileName),
      pluginCtx
    );
    const configOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ConfigFileName),
      pluginCtx
    );
    const configModule = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ConfigurationModuleTemplateFileName),
      pluginCtx
    );
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { bot: provisionModules },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { bot: configModule },
      },
      Reference: {
        resourceId: BotBicep.resourceId,
        hostName: BotBicep.hostName,
        webAppEndpoint: BotBicep.webAppEndpoint,
      },
      Parameters: JSON.parse(
        await fs.readFile(
          path.join(bicepTemplateDir, Bicep.ParameterFileName),
          ConstantString.UTF8Encoding
        )
      ),
    };
    ctx.logProvider.info(Messages.SuccessfullyGenerateArmTemplatesBot);
    return ok([{ kind: "bicep", template: result }]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.bot } })])
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    const scaffoldRes = await this.scaffold(ctx, inputs);
    if (scaffoldRes.isErr()) return err(scaffoldRes.error);
    const armRes = await this.generateResourceTemplate(ctx, inputs);
    if (armRes.isErr()) return err(armRes.error);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const capabilities = solutionSettings.capabilities;
    const capabilitiesAnswer = inputs[AzureSolutionQuestionNames.Capabilities] as string[];
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (capabilitiesAnswer.includes(BotOptionItem.id) && !capabilities.includes(BotOptionItem.id))
      capabilities.push(BotOptionItem.id);
    if (
      capabilitiesAnswer.includes(MessageExtensionItem.id) &&
      !capabilities.includes(MessageExtensionItem.id)
    )
      capabilities.push(MessageExtensionItem.id);
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok(armRes.value);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async afterOtherFeaturesAdded(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.OtherFeaturesAddedInputs
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    ctx.logProvider.info(Messages.UpdatingArmTemplatesBot);
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    const pluginCtx = { plugins: solutionSettings ? solutionSettings.activeResourcePlugins : [] };
    const bicepTemplateDir = path.join(getTemplatesFolder(), PathInfo.BicepTemplateRelativeDir);
    const configModule = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ConfigurationModuleTemplateFileName),
      pluginCtx
    );
    const result: ArmTemplateResult = {
      Reference: {
        resourceId: BotBicep.resourceId,
        hostName: BotBicep.hostName,
        webAppEndpoint: BotBicep.webAppEndpoint,
      },
      Configuration: {
        Modules: { bot: configModule },
      },
    };
    ctx.logProvider.info(Messages.SuccessfullyUpdateArmTemplatesBot);
    return ok([{ kind: "bicep", template: result }]);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }
}
