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
  BotTrigger,
  PluginBot,
  QuestionBotScenarioToPluginActRoles,
} from "../resources/strings";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";
import * as utils from "../utils/common";
import { HostTypeTriggerOptions } from "../question";

export type Configurations = string[];

export class CodeTemplateProvider {
  static getTemplates(ctx: Context, inputs: Inputs): CodeTemplateInfo[] {
    const actRoles = this.resolveActRoles(ctx, inputs);
    const triggers = this.resolveTriggers(inputs);
    const hostType = this.resolveHostType(ctx);
    const lang = this.resolveProgrammingLanguage(ctx);

    const scenarios = this.resolveScenarios(actRoles, triggers, hostType);

    return scenarios.map((scenario) => {
      return {
        group: TemplateProjectsConstants.GROUP_NAME_BOT,
        language: lang,
        scenario: scenario,
        variables: {},
      };
    });
  }

  private static resolveActRoles(ctx: Context, inputs: Inputs): PluginActRoles[] {
    let actRoles: PluginActRoles[] = [];

    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    // Null check solutionSettings
    const capabilities = solutionSettings.capabilities;
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

    return actRoles;
  }

  private static resolveHostType(ctx: Context): string {
    const rawHostType = ctx.projectSetting?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
      PluginBot.HOST_TYPE
    ] as string;
    const hostType = utils.convertToConstValues(rawHostType, HostTypes);
    if (!hostType) {
      throw new Error("Invalid host type");
    }
    return hostType;
  }

  private static resolveTriggers(inputs: Inputs): BotTrigger[] {
    const rawHostTypeTriggers = inputs?.[QuestionNames.BOT_HOST_TYPE_TRIGGER];
    if (!Array.isArray(rawHostTypeTriggers)) {
      return [];
    }
    // convert HostTypeTrigger question to trigger name
    return rawHostTypeTriggers
      .map((hostTypeTrigger) => {
        const option = HostTypeTriggerOptions.find((option) => option.id === hostTypeTrigger);
        return option?.trigger;
      })
      .filter((item): item is BotTrigger => item !== undefined);
  }

  private static resolveProgrammingLanguage(ctx: Context): string {
    const lang = ctx.projectSetting.programmingLanguage;
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

  private static resolveScenarios(
    actRoles: PluginActRoles[],
    triggers: BotTrigger[],
    hostType: string
  ): string[] {
    const scenarios: string[] = [];
    if (hostType === HostTypes.AZURE_FUNCTIONS) {
      if (actRoles.includes(PluginActRoles.Notification)) {
        scenarios.push(TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME);
        triggers.map((trigger) => scenarios.push(TriggerTemplateScenarioMappings[trigger]));
      }
    }
    if (hostType === HostTypes.APP_SERVICE) {
      // TODO: support command & respond bot
      scenarios.push(TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME);
    }
    return scenarios;
  }

  static getConfigurations(ctx: Context, inputs: Inputs): Configurations {
    const lang = this.resolveProgrammingLanguage(ctx);

    const configurations: Configurations = [];

    if (lang === "js" || lang === "ts") {
      configurations.push("node");
    }
    if (lang === "csharp") {
      configurations.push("dotnet");
    }

    configurations.push("running-on-azure");

    return configurations;
  }

  static getBuiltArtifact(ctx: Context, inputs: Inputs) {}
}
