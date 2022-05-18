// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, AzureSolutionSettings } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { ServiceType } from "../../../../common/azure-hosting/interfaces";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { AzureSolutionQuestionNames, BotScenario } from "../../../solution";
import { QuestionNames, TemplateProjectsConstants, TemplateProjectsScenarios } from "../constants";
import {
  AppServiceOptionItem,
  HostTypeTriggerOptionItem,
  HostTypeTriggerOptions,
} from "../question";
import { HostType, HostTypes, PluginBot } from "../resources/strings";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";
import { langMap, serviceMap, triggerScenarioMap } from "./mapping";

export function getTemplateInfos(ctx: Context, inputs: Inputs): CodeTemplateInfo[] {
  const lang = resolveProgrammingLanguage(ctx);
  const scenarios = decideTemplateScenarios(ctx, inputs);
  return scenarios.map((scenario) => {
    return {
      group: TemplateProjectsConstants.GROUP_NAME_BOT,
      language: lang,
      scenario: scenario,
      variables: {},
    };
  });
}

export function decideTemplateScenarios(ctx: Context, inputs: Inputs): string[] {
  const isM365 = ctx.projectSetting?.isM365;
  const templateScenarios = [];
  if (isM365) {
    templateScenarios.push(TemplateProjectsScenarios.M365_SCENARIO_NAME);
    return templateScenarios;
  }
  const botScenarios = inputs?.[AzureSolutionQuestionNames.Scenarios];
  if (botScenarios) {
    botScenarios.map((scenario: string) => {
      switch (scenario) {
        case BotScenario.CommandAndResponseBot:
          templateScenarios.push(TemplateProjectsScenarios.COMMAND_AND_RESPONSE_SCENARIO_NAME);
          break;
        case BotScenario.NotificationBot:
          const notificationTriggerType = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] as string[];
          if (notificationTriggerType.includes(AppServiceOptionItem.id)) {
            templateScenarios.push(TemplateProjectsScenarios.NOTIFICATION_RESTIFY_SCENARIO_NAME);
          } else {
            const options = resolveTriggerOption(inputs);
            templateScenarios.push(
              TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME
            );
            options.map((option) => {
              if (!option.trigger || !triggerScenarioMap[option.trigger]) {
                throw new Error(
                  getLocalizedString("error.bot.InvalidNotificationTriggerError", option.trigger)
                );
              }
              templateScenarios.push(triggerScenarioMap[option.trigger]);
            });
          }
          break;
      }
    });
  } else {
    templateScenarios.push(TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME);
  }
  return templateScenarios;
}

export function resolveProgrammingLanguage(ctx: Context): string {
  const lang = ctx.projectSetting.programmingLanguage;
  if (!lang || !(lang.toLowerCase() in langMap)) {
    throw new Error(getLocalizedString("error.bot.InvalidLanguageError", lang));
  }
  return langMap[lang.toLowerCase()];
}

export function resolveTriggerOption(inputs: Inputs): HostTypeTriggerOptionItem[] {
  const notificationTriggerType = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER];
  if (Array.isArray(notificationTriggerType)) {
    const options = notificationTriggerType
      .map((item) => HostTypeTriggerOptions.find((option) => option.id === item))
      .filter((item) => item) as HostTypeTriggerOptionItem[];
    return options;
  }
  throw new Error(
    getLocalizedString("error.bot.InvalidNotificationTriggerError", notificationTriggerType)
  );
}

export function resolveHostType(inputs: Inputs): HostType {
  const notificationTriggerType = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER];
  let hostType;
  if (Array.isArray(notificationTriggerType)) {
    const hostTypes = notificationTriggerType.map(
      (item) => HostTypeTriggerOptions.find((option) => option.id === item)?.hostType
    );
    hostType = hostTypes ? hostTypes[0] : undefined;
  }
  return hostType ? hostType : HostTypes.APP_SERVICE;
}

export function resolveServiceType(ctx: Context): ServiceType {
  const rawHostType =
    ctx.projectSetting?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[PluginBot.HOST_TYPE];
  if (!rawHostType || !(rawHostType in serviceMap)) {
    throw new Error(getLocalizedString("error.bot.InvalidHostTypeError", rawHostType));
  }
  return serviceMap[rawHostType];
}
