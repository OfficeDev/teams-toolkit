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
    const feature = inputs.feature as string;
    const triggers = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] as string[];
    inputs.hosting = "azure-web-app";
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
          scenarios.push(
            TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME
          );
        }
        if (triggers.includes(FunctionsTimerTriggerOptionItem.id)) {
          scenarios.push(
            TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME
          );
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
    const configActions: Action[] = [
      {
        name: `call:${inputs.hosting}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}-config.generateBicep`,
        inputs: {
          componentId: this.name,
          scenario: "Bot",
        },
      },
    ];
    if (getComponent(context.projectSetting, ComponentNames.APIM) !== undefined) {
      configActions.push({
        name: "call:apim-config.generateBicep",
        type: "call",
        required: true,
        targetAction: "apim-config.generateBicep",
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
          // add teams-bot
          const botConfig = getComponent(projectSettings, ComponentNames.TeamsBot);
          if (botConfig) {
            if (botCapability && !botConfig.capabilities.includes(botCapability)) {
              botConfig.capabilities.push(botCapability);
            }
            return ok(["config Bot in project settings"]);
          }
          projectSettings.components.push({
            name: "teams-bot",
            hosting: inputs.hosting,
            capabilities: botCapability ? [botCapability] : [],
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
          // connect azure-sql to hosting component
          if (getComponent(context.projectSetting, "azure-sql")) {
            hostingComponent.connections.push("azure-sql");
          }
          const apimConfig = getComponent(projectSettings, ComponentNames.APIM);
          if (apimConfig) {
            apimConfig.connections?.push("teams-bot");
          }
          projectSettings.programmingLanguage = inputs[CoreQuestionNames.ProgrammingLanguage];
          return ok(["config Bot in project settings"]);
        },
      },
      {
        name: "call:bot-code.generate",
        type: "call",
        required: true,
        targetAction: "bot-code.generate",
        inputs: {
          scenarios: scenarios,
        },
      },
      {
        type: "call",
        targetAction: "bicep.init",
        required: true,
      },
      {
        name: `call:${inputs.hosting}.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}.generateBicep`,
        inputs: {
          componentId: this.name,
          scenario: "Bot",
        },
      },
      {
        name: "call:bot-service.generateBicep",
        type: "call",
        required: true,
        targetAction: "bot-service.generateBicep",
        inputs: {
          componentId: this.name,
          scenario: "Bot",
        },
      },
      ...configActions,
      {
        name: "call:app-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "app-manifest.addCapability",
        inputs: {
          capabilities: [manifestCapability],
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
