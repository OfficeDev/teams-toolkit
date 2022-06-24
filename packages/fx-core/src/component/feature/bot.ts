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
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getProjectSettingsPath } from "../../core/middleware/projectSettingsLoader";
import {
  CommandAndResponseOptionItem,
  NotificationOptionItem,
} from "../../plugins/solution/fx-solution/question";
import { QuestionNames, TemplateProjectsScenarios } from "../../plugins/resource/bot/constants";
import {
  AppServiceOptionItem,
  AppServiceOptionItemForVS,
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
} from "../../plugins/resource/bot/question";
import { LoadProjectSettingsAction, WriteProjectSettingsAction } from "../projectSettingsManager";
import { getComponent } from "../workflow";
import { CoreQuestionNames } from "../../core/question";
import "../code/botCode";
import "../resource/appManifest/appManifest";
import "../resource/botService";
import "../resource/azureWebApp";
import "../connection/azureWebAppConfig";
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
    } else if (feature === CommandAndResponseOptionItem.id) {
      scenarios.push(TemplateProjectsScenarios.COMMAND_AND_RESPONSE_SCENARIO_NAME);
    } else {
      scenarios.push(TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME);
    }
    const actions: Action[] = [
      LoadProjectSettingsAction,
      {
        name: "fx.configBot",
        type: "function",
        plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
          const remarks = [
            `add components 'teams-bot', '${inputs.hosting}', 'bot-service' in projectSettings`,
          ];
          // connect to azure-sql
          if (getComponent(context.projectSetting, "azure-sql")) {
            remarks.push(
              `connect 'azure-sql' to hosting component '${inputs.hosting}' in projectSettings`
            );
          }
          return ok(remarks);
        },
        execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
          const projectSettings = context.projectSetting;
          // add teams-bot
          projectSettings.components.push({
            name: "teams-bot",
            hosting: inputs.hosting,
          });
          // add hosting component
          const hostingComponent = {
            name: inputs.hosting,
            connections: ["teams-bot"],
          };
          projectSettings.components.push(hostingComponent);
          //add bot-service
          projectSettings.components.push({
            name: "bot-service",
            provision: true,
          });
          const remarks = [
            `add components 'teams-bot', '${inputs.hosting}', 'bot-service' in projectSettings`,
          ];
          // connect azure-sql to hosting component
          if (getComponent(context.projectSetting, "azure-sql")) {
            hostingComponent.connections.push("azure-sql");
            remarks.push(
              `connect 'azure-sql' to hosting component '${inputs.hosting}' in projectSettings`
            );
          }
          projectSettings.programmingLanguage = inputs[CoreQuestionNames.ProgrammingLanguage];
          return ok([
            {
              type: "file",
              operate: "replace",
              filePath: getProjectSettingsPath(inputs.projectPath),
              remarks: remarks.join(";"),
            },
          ]);
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
      },
      {
        name: "call:bot-service.generateBicep",
        type: "call",
        required: true,
        targetAction: "bot-service.generateBicep",
      },
      {
        name: `call:${inputs.hosting}-config.generateBicep`,
        type: "call",
        required: true,
        targetAction: `${inputs.hosting}-config.generateBicep`,
      },
      {
        name: "call:app-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "app-manifest.addCapability",
        inputs: {
          capabilities: [{ name: "Bot" }],
        },
      },
      {
        name: "call:debug.generateLocalDebugSettings",
        type: "call",
        required: true,
        targetAction: "debug.generateLocalDebugSettings",
      },
      WriteProjectSettingsAction,
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
