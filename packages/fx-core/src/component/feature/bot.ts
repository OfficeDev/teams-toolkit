// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CallAction,
  ContextV3,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  AzureSolutionQuestionNames,
  CommandAndResponseOptionItem,
  M365SearchAppOptionItem,
  MessageExtensionItem,
  NotificationOptionItem,
} from "../../plugins/solution/fx-solution/question";
import { QuestionNames, TemplateProjectsScenarios } from "../../plugins/resource/bot/constants";
import {
  AppServiceOptionItem,
  AppServiceOptionItemForVS,
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
} from "../../plugins/resource/bot/question";
import { getComponent } from "../workflow";
import { CoreQuestionNames } from "../../core/question";
import "../code/botCode";
import "../resource/appManifest/appManifest";
import "../resource/botService";
import "../resource/azureAppService/azureWebApp";
import "../connection/azureWebAppConfig";
import { ComponentNames, Scenarios } from "../constants";
import { identityAction } from "../resource/identity";
import { globalVars } from "../../core/globalVars";
import { isVSProject } from "../../common/projectSettingsHelper";
@Service("teams-bot")
export class TeamsBot {
  name = "teams-bot";
  /**
   *
   *   capability = Notification
   *     bot-host-type-trigger = http-restify
   *       group=bot, scenario=notification-restify, host=app-service
   *     bot-host-type-trigger = [http-functions, timer-functions]
   *       group=bot, host=function, scenario=notification-function-base + [notification-trigger-http, notification-trigger-timer]
   *   capability = command-bot:
   *     group=bot, host=app-service, scenario=command-and-response
   *   capability = Bot
   *     group=bot, host=app-service, scenario=default
   *   capability = MessagingExtension
   *     group=bot, host=app-service, scenario=default
   */

  /**
   * 1. config bot in project settings
   * 2. generate bot source code
   * 3. generate bot-service and hosting bicep
   * 3. overwrite hosting config bicep
   * 4. persist bicep
   * 5. add capability in teams manifest
   */
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configBicepActions: Action[] = [];
    if (inputs.hosting) {
      configBicepActions.push({
        name: `call:${inputs.hosting}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}-config.generateBicep`,
        condition: (context, inputs) => {
          if (inputs.hosting) {
            inputs.componentId = this.name;
            inputs.scenario = "Bot";
          }
          return ok(inputs.hosting !== undefined);
        },
      });
    }
    configBicepActions.push({
      name: "call:apim-config.generateBicep",
      type: "call",
      required: true,
      targetAction: "apim-config.generateBicep",
      condition: (context, inputs) => {
        return ok(getComponent(context.projectSetting, ComponentNames.APIM) !== undefined);
      },
    });
    configBicepActions.push(identityAction);
    const provisionBicepActions: Action[] = [];
    if (inputs.hosting) {
      provisionBicepActions.push({
        name: `call:${inputs.hosting}.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}.generateBicep`,
        inputs: {
          componentId: this.name,
          scenario: "Bot",
        },
        pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
          inputs.scenario = "Bot";
          inputs.componentId = this.name;
          return ok(undefined);
        },
      });
    }
    const actions: Action[] = [
      {
        name: "fx.configBot",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          return ok(["config Bot in project settings"]);
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          const projectSettings = context.projectSetting;
          const res = getScenariosAndBotCapability(inputs);
          // add teams-bot
          const botConfig = getComponent(projectSettings, ComponentNames.TeamsBot);
          if (botConfig) {
            if (res.botCapability && !botConfig.capabilities.includes(res.botCapability)) {
              botConfig.capabilities.push(res.botCapability);
            }
            return ok(["config Bot in project settings"]);
          }
          projectSettings.components.push({
            name: "teams-bot",
            hosting: inputs.hosting,
            deploy: true,
            capabilities: res.botCapability ? [res.botCapability] : [],
          });
          // add hosting component
          const hostingComponent = {
            name: inputs.hosting,
            connections: ["teams-bot"],
            scenario: Scenarios.Bot,
          };
          projectSettings.components.push(hostingComponent);
          //add bot-service
          projectSettings.components.push({
            name: "bot-service",
            provision: true,
          });
          // add default identity
          if (!getComponent(context.projectSetting, ComponentNames.Identity)) {
            projectSettings.components.push({
              name: ComponentNames.Identity,
              provision: true,
            });
          }
          // connect identity to hosting component
          hostingComponent.connections.push(ComponentNames.Identity);
          // connect azure-sql to hosting component
          if (getComponent(context.projectSetting, "azure-sql")) {
            hostingComponent.connections.push("azure-sql");
          }
          const apimConfig = getComponent(projectSettings, ComponentNames.APIM);
          if (apimConfig) {
            apimConfig.connections?.push("teams-bot");
          }
          projectSettings.programmingLanguage =
            projectSettings.programmingLanguage || inputs[CoreQuestionNames.ProgrammingLanguage];
          globalVars.isVS = isVSProject(projectSettings);
          return ok(["config Bot in project settings"]);
        },
      },
      {
        name: "call:bot-code.generate",
        type: "call",
        required: true,
        targetAction: "bot-code.generate",
        pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const res = getScenariosAndBotCapability(inputs);
          inputs.scenarios = res.scenarios;
          return ok(undefined);
        },
      },
      {
        type: "call",
        targetAction: "bicep.init",
        required: true,
      },
      ...provisionBicepActions,
      ...configBicepActions,
      {
        name: "call:app-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "app-manifest.addCapability",
        pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const res = getScenariosAndBotCapability(inputs);
          inputs.capabilities = [res.manifestCapability];
          return ok(undefined);
        },
      },
      {
        name: "call:debug.generateLocalDebugSettings",
        type: "call",
        required: true,
        targetAction: "debug.generateLocalDebugSettings",
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "teams-bot.add",
      mode: "sequential",
      actions: actions,
    };
    return ok(group);
  }
  build(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: CallAction = {
      name: "teams-bot.build",
      type: "call",
      targetAction: "bot-code.build",
      required: true,
    };
    return ok(action);
  }
}

function getScenariosAndBotCapability(inputs: InputsWithProjectPath): {
  scenarios: string[];
  botCapability: string;
  manifestCapability: v3.ManifestCapability;
} {
  const feature = inputs[AzureSolutionQuestionNames.Features] as string;
  const triggers = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] as string[];
  const scenarios: string[] = [];
  const manifestCapability: v3.ManifestCapability = {
    name: feature === MessageExtensionItem.id ? "MessageExtension" : "Bot",
  };
  let botCapability: string;
  if (feature === NotificationOptionItem.id) {
    if (triggers.includes(AppServiceOptionItem.id)) {
      scenarios.push(TemplateProjectsScenarios.NOTIFICATION_RESTIFY_SCENARIO_NAME);
    } else if (triggers.includes(AppServiceOptionItemForVS.id)) {
      scenarios.push(TemplateProjectsScenarios.NOTIFICATION_WEBAPI_SCENARIO_NAME);
    } else {
      inputs.hosting = "azure-function";
      scenarios.push(TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME);
      if (triggers.includes(FunctionsHttpTriggerOptionItem.id)) {
        scenarios.push(TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME);
      }
      if (triggers.includes(FunctionsTimerTriggerOptionItem.id)) {
        scenarios.push(TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME);
      }
    }
    botCapability = "notification";
  } else if (feature === CommandAndResponseOptionItem.id) {
    scenarios.push(TemplateProjectsScenarios.COMMAND_AND_RESPONSE_SCENARIO_NAME);
    botCapability = "command-response";
  } else if (feature === MessageExtensionItem.id || feature === M365SearchAppOptionItem.id) {
    botCapability = "message-extension";
    if (feature === M365SearchAppOptionItem.id) {
      scenarios.push(TemplateProjectsScenarios.M365_SCENARIO_NAME);
    } else {
      scenarios.push(TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME);
    }
  } else {
    scenarios.push(TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME);
    botCapability = "bot";
  }
  return {
    scenarios,
    botCapability,
    manifestCapability,
  };
}
