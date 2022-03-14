// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext } from "@microsoft/teamsfx-api";
import { LanguageStrategy } from "../languageStrategy";
import { Messages } from "../resources/messages";
import { FxResult, FxBotPluginResultFactory as ResultFactory } from "../result";
import { ProgressBarConstants, TemplateProjectsConstants } from "../constants";

import { HostTypes } from "../resources/strings";
import { SomethingMissingError } from "../errors";
import { ProgressBarFactory } from "../progressBars";
import { Logger } from "../logger";
import { TeamsBotImpl } from "../plugin";

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
}
