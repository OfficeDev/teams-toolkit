// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { LanguageStrategy } from "../languageStrategy";
import { Messages } from "../resources/messages";
import { FxResult, FxBotPluginResultFactory as ResultFactory } from "../result";
import { BotBicep, PathInfo, ProgressBarConstants, TemplateProjectsConstants } from "../constants";

import { HostTypes } from "../resources/strings";
import { SomethingMissingError } from "../errors";
import { ProgressBarFactory } from "../progressBars";
import { Logger } from "../logger";
import { TeamsBotImpl } from "../plugin";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import * as path from "path";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../../../folder";
import { Bicep, ConstantString } from "../../../../common/constants";
import { generateBicepFromFile } from "../../../../common/tools";
import { ArmTemplateResult } from "../../../../common/armInterface";

export class FunctionsHostedBotImpl extends TeamsBotImpl {
  public async scaffold(context: PluginContext): Promise<FxResult> {
    this.ctx = context;

    await this.config.restoreConfigFromContext(context);
    this.config.scaffold.hostType = HostTypes.AZURE_FUNCTIONS;

    Logger.info(Messages.ScaffoldingBot);

    const handler = await ProgressBarFactory.newProgressBar(
      ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_TITLE,
      ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_STEPS_NUM,
      this.ctx
    );
    await handler?.start(ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_START);

    // 1. Copy the corresponding template project into target directory.
    const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
    if (!this.config.actRoles) {
      throw new SomethingMissingError("act roles");
    }

    await handler?.next(
      ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_FETCH_PROJECT_TEMPLATE
    );
    await LanguageStrategy.scaffoldProject(group_name, this.config);

    // 2. Copy the trigger template(s) into the trigger directories.
    // For example,
    //  templates/bot/ts/notification-trigger-http ==> ${projectRoot}/notifyHttpTrigger
    await handler?.next(
      ProgressBarConstants.SCAFFOLD_FUNCTIONS_NOTIFICATION_STEP_FETCH_TRIGGER_TEMPLATE
    );
    await LanguageStrategy.scaffoldTriggers(group_name, this.config);

    this.config.saveConfigIntoContext(context);
    Logger.info(Messages.SuccessfullyScaffoldedBot);

    return ResultFactory.Success();
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<FxResult> {
    Logger.info(Messages.GeneratingArmTemplatesBot);
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDir = path.join(getTemplatesFolder(), PathInfo.BicepTemplateRelativeDir);
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.FuncHostedProvisionModuleTemplateFileName),
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

    Logger.info(Messages.SuccessfullyGenerateArmTemplatesBot);
    return ResultFactory.Success(result);
  }
}
