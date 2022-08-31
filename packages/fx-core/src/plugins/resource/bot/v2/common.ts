// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  BotScenario,
  M365SearchAppOptionItem,
  MessageExtensionNewUIItem,
} from "../../../solution/fx-solution/question";
import { QuestionNames, TemplateProjectsConstants, TemplateProjectsScenarios } from "../constants";
import { AppServiceOptionItem, FunctionsOptionItems } from "../question";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";
import { getLanguage, getServiceType, getTriggerScenarios } from "./mapping";
import { ServiceType } from "../../../../common/azure-hosting/interfaces";
import { CoreQuestionNames } from "../../../../core/question";
import { HostType } from "./enum";
import {
  BotCapabilities,
  BotCapability,
  PluginBot,
  QuestionBotScenarioToBotCapability,
} from "../resources/strings";
import { convertToAlphanumericOnly } from "../../../../common/utils";

export function getTemplateInfos(ctx: Context, inputs: Inputs): CodeTemplateInfo[] {
  const lang = getLanguage(ctx.projectSetting.programmingLanguage);
  const scenarios = Array.from(decideTemplateScenarios(ctx, inputs));
  const projectName = ctx.projectSetting.appName;
  const safeProjectName =
    inputs[CoreQuestionNames.SafeProjectName] ?? convertToAlphanumericOnly(projectName);
  return scenarios.map((scenario) => {
    return {
      group: TemplateProjectsConstants.GROUP_NAME_BOT,
      language: lang,
      scenario: scenario,
      variables: { ProjectName: projectName, SafeProjectName: safeProjectName },
    };
  });
}

export function decideTemplateScenarios(ctx: Context, inputs: Inputs): Set<string> {
  const botScenarios = inputs?.[AzureSolutionQuestionNames.Scenarios];
  const templateScenarios: Set<string> = new Set<string>();

  if (!botScenarios || (Array.isArray(botScenarios) && botScenarios.length === 0)) {
    templateScenarios.add(TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME);
    return templateScenarios;
  }

  botScenarios.forEach((scenario: string) => {
    switch (scenario) {
      case BotScenario.CommandAndResponseBot:
        templateScenarios.add(TemplateProjectsScenarios.COMMAND_AND_RESPONSE_SCENARIO_NAME);
        break;
      case BotScenario.WorkflowBot:
        templateScenarios.add(TemplateProjectsScenarios.WORKFLOW_SCENARIO_NAME);
        break;
      case BotScenario.NotificationBot:
        //! Will not scaffold any trigger when notificationTriggerType is undefined,
        const notificationTriggerType = (inputs[
          QuestionNames.BOT_HOST_TYPE_TRIGGER
        ] as string[]) ?? [AppServiceOptionItem.id];
        notificationTriggerType.forEach((triggerType) => {
          getTriggerScenarios(triggerType).forEach((item) => templateScenarios.add(item));
        });
        break;
      case M365SearchAppOptionItem.id:
        templateScenarios.add(TemplateProjectsScenarios.M365_SCENARIO_NAME);
        break;
    }
  });
  return templateScenarios;
}

export function resolveHostType(inputs: Inputs): HostType {
  const notificationTriggerType = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER];
  if (Array.isArray(notificationTriggerType)) {
    return FunctionsOptionItems.some((item) => notificationTriggerType.includes(item.id))
      ? HostType.Functions
      : HostType.AppService;
  }
  return HostType.AppService;
}

export function resolveServiceType(ctx: Context): ServiceType {
  const rawHostType =
    (ctx.projectSetting?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
      PluginBot.HOST_TYPE
    ] as string) ?? HostType.AppService;
  return getServiceType(rawHostType);
}

export function resolveBotCapabilities(inputs: Inputs): BotCapability[] {
  const capabilities = inputs?.[AzureSolutionQuestionNames.Capabilities];
  const botScenarios = inputs?.[AzureSolutionQuestionNames.Scenarios];
  if (Array.isArray(botScenarios)) {
    if (botScenarios.includes(M365SearchAppOptionItem.id)) {
      return [BotCapabilities.M365_SEARCH_APP];
    }
    return botScenarios.map((scenario) => QuestionBotScenarioToBotCapability.get(scenario)!);
  }
  if (Array.isArray(capabilities)) {
    if (capabilities.includes(MessageExtensionNewUIItem.id)) {
      return [BotCapabilities.MESSAGE_EXTENSION];
    }
    if (capabilities.includes(BotOptionItem.id)) {
      return [BotCapabilities.BOT];
    }
  }
  return [];
}
