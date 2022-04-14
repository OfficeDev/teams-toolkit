// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, Inputs } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { isBotNotificationEnabled } from "../../../../common";
import { AzureSolutionQuestionNames } from "../../../solution/fx-solution/question";
import {
  QuestionNames,
  TemplateProjectsConstants,
  TemplateProjectsScenarios,
  TriggerTemplateScenarioMappings,
} from "../constants";
import { PluginActRoles } from "../enums/pluginActRoles";
import {
  HostTypes,
  NotificationTrigger,
  PluginBot,
  QuestionBotScenarioToPluginActRoles,
} from "../resources/strings";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";
import * as utils from "../utils/common";
import { HostTypeTriggerOptions } from "../question";

export type AppSettings = { [key: string]: string };

export class CodeTemplateProvider {
  static getTemplates(ctx: Context, inputs: Inputs): CodeTemplateInfo[] {
    const scenarios = this.resolveScenario(ctx, inputs);
    return scenarios.map((scenario) => {
      return {
        group: TemplateProjectsConstants.GROUP_NAME_BOT,
        language: this.validateProgrammingLanguage(ctx.projectSetting.programmingLanguage),
        scenario: scenario,
        version: "0.1.0",
        localTemplateBaseName: "",
        localTemplatePath: "",
        variables: {},
      };
    });
  }

  private static resolveScenario(ctx: Context, inputs: Inputs): string[] {
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    // Null check solutionSettings
    const capabilities = solutionSettings.capabilities;
    let actRoles: PluginActRoles[] = [];

    if (capabilities?.includes(PluginActRoles.Bot)) {
      const scenarios = inputs?.[AzureSolutionQuestionNames.Scenarios];
      if (isBotNotificationEnabled() && Array.isArray(scenarios)) {
        const scenarioActRoles = scenarios
          .map((item) => QuestionBotScenarioToPluginActRoles.get(item))
          .filter((item): item is PluginActRoles => item !== undefined);
        // dedup
        actRoles = [...new Set([...actRoles, ...scenarioActRoles])];
      } else {
        // for legacy bot
        actRoles.push(PluginActRoles.Bot);
      }
    }

    if (capabilities?.includes(PluginActRoles.MessageExtension)) {
      actRoles.push(PluginActRoles.MessageExtension);
    }

    const rawHostType = ctx.projectSetting?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
      PluginBot.HOST_TYPE
    ] as string;

    const hostType = utils.convertToConstValues(rawHostType, HostTypes);

    const scenarios: string[] = [];
    if (hostType === HostTypes.AZURE_FUNCTIONS) {
      if (actRoles.includes(PluginActRoles.Notification)) {
        scenarios.push(TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME);
        const rawHostTypeTriggers = inputs?.[QuestionNames.BOT_HOST_TYPE_TRIGGER];
        if (Array.isArray(rawHostTypeTriggers)) {
          // convert HostTypeTrigger question to trigger name
          const triggers = rawHostTypeTriggers
            .map((hostTypeTrigger) => {
              const option = HostTypeTriggerOptions.find((option) => option.id === hostTypeTrigger);
              return option?.trigger;
            })
            .filter((item): item is NotificationTrigger => item !== undefined);
          triggers.map((trigger) => scenarios.push(TriggerTemplateScenarioMappings[trigger]));
        }
      }
    }
    return scenarios;
  }

  private static validateProgrammingLanguage(lang?: string): string {
    switch (lang?.toLocaleLowerCase()) {
      case "javascript":
        return "js";
      case "typescript":
        return "ts";
      case "csharp":
        return "csharp";
    }
    throw new Error("Invalid programming language");
  }

  static getConfigurations(ctx: Context, inputs: Inputs): AppSettings {
    // language and scenario
    return { WEBSITE_NODE_DEFAULT_VERSION: "~14" };
  }

  static getConfigurationBiceps(ctx: Context, inputs: Inputs): string[] {
    // language and scenario
    return ["webappProvision.node.template.bicep", "webappConfiguration.node.template.bicep"];
  }

  static getBuiltArtifact(ctx: Context, inputs: Inputs) {}
}
