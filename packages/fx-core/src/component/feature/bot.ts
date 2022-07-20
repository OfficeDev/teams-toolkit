// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CallAction,
  ContextV3,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  ProjectSettingsV3,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import {
  BotOptionItem,
  CommandAndResponseOptionItem,
  M365SearchAppOptionItem,
  MessageExtensionItem,
  NotificationOptionItem,
  AzureSolutionQuestionNames,
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
import { Plans } from "../messages";
@Service("teams-bot")
export class TeamsBot {
  name = "teams-bot";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(this.addBotAction(context, inputs));
  }
  build(): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(this.buildBotAction());
  }

  /**
   * 1. config bot in project settings
   * 2. generate bot source code
   * 3. generate bot-service and hosting bicep
   * 3. overwrite hosting config bicep
   * 4. persist bicep
   * 5. add capability in teams manifest
   */
  addBotAction(context: ContextV3, inputs: InputsWithProjectPath): Action {
    const actions: Action[] = [];
    this.setupConfiguration(actions, context);
    this.setupCode(actions, context);
    this.setupBicep(actions, context, inputs);
    this.setupManifest(actions);
    return {
      type: "group",
      name: "teams-bot.add",
      mode: "sequential",
      actions: actions,
    };
  }
  buildBotAction(): Action {
    return {
      name: "teams-bot.build",
      type: "call",
      targetAction: "bot-code.build",
      required: true,
    };
  }

  private setupConfiguration(actions: Action[], context: ContextV3): Action[] {
    if (this.hasBot(context.projectSetting)) {
      actions.push(addBotCapability);
    } else {
      actions.push(configBot);
    }
    return actions;
  }

  private setupCode(actions: Action[], context: ContextV3): Action[] {
    if (this.hasBot(context.projectSetting)) {
      return actions;
    }
    actions.push(generateBotCode);
    actions.push(initLocalDebug);
    return actions;
  }

  private setupBicep(
    actions: Action[],
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Action[] {
    if (this.hasBot(context.projectSetting)) {
      return actions;
    }
    const hosting = resolveHosting(inputs);
    actions.push(initBicep);
    actions.push(generateBotService(hosting));
    actions.push(generateHosting(hosting, this.name));
    actions.push(configHosting(hosting, this.name));
    // Configure apim if it exists, create identity if it does not exist
    actions.push(configApim);
    if (getComponent(context.projectSetting, ComponentNames.Identity) === undefined) {
      actions.push(identityAction);
    }
    return actions;
  }

  private setupManifest(actions: Action[]): Action[] {
    actions.push(addCapabilities);
    return actions;
  }

  private hasBot(projectSetting: ProjectSettingsV3): boolean {
    return !!getComponent(projectSetting, ComponentNames.TeamsBot);
  }
}

const addCapabilities: Action = {
  name: "call:app-manifest.addCapability",
  type: "call",
  required: true,
  targetAction: "app-manifest.addCapability",
  pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
    const manifestCapability: v3.ManifestCapability = {
      name:
        inputs[AzureSolutionQuestionNames.Features] === MessageExtensionItem.id
          ? "MessageExtension"
          : "Bot",
    };
    inputs.capabilities = [manifestCapability];
    return ok(undefined);
  },
};

const initBicep: Action = {
  type: "call",
  targetAction: "bicep.init",
  required: true,
};

const generateBotService: (hosting: string) => Action = (hosting) => ({
  name: "call:bot-service.generateBicep",
  type: "call",
  required: true,
  targetAction: "bot-service.generateBicep",
  inputs: {
    hosting: hosting,
    scenario: "Bot",
  },
});

const generateHosting: (hosting: string, componentId: string) => Action = (
  hosting,
  componentId
) => ({
  name: `call:${hosting}.generateBicep`,
  type: "call",
  required: true,
  targetAction: `${hosting}.generateBicep`,
  inputs: {
    componentId: componentId,
    scenario: "Bot",
  },
});

const configHosting: (hosting: string, componentId: string) => Action = (hosting, componentId) => ({
  name: `call:${hosting}-config.generateBicep`,
  type: "call",
  required: true,
  targetAction: `${hosting}-config.generateBicep`,
  inputs: {
    componentId: componentId,
    scenario: "Bot",
  },
});

const generateBotCode: CallAction = {
  name: "call:bot-code.generate",
  type: "call",
  required: true,
  targetAction: "bot-code.generate",
  pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
    const scenarios = featureToScenario.get(inputs[AzureSolutionQuestionNames.Features])?.(
      inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER]
    );
    inputs.scenarios = scenarios;
    return ok(undefined);
  },
};

const configApim: CallAction = {
  name: "call:apim-config.generateBicep",
  type: "call",
  required: true,
  targetAction: "apim-config.generateBicep",
  condition: (context: ContextV3) => {
    return ok(getComponent(context.projectSetting, ComponentNames.APIM) != undefined);
  },
};

const initLocalDebug: Action = {
  name: "call:debug.generateLocalDebugSettings",
  type: "call",
  required: true,
  targetAction: "debug.generateLocalDebugSettings",
};

const addBotCapability: Action = {
  name: "fx.addBotCapability",
  type: "function",
  plan: () => ok([Plans.addFeature("Bot")]),
  execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    const botCapability = featureToCapability.get(
      inputs[AzureSolutionQuestionNames.Features] as string
    );
    const bot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
    if (bot && !bot.capabilities) {
      bot.capabilities = [botCapability];
    }
    if (bot && !bot.capabilities.includes(botCapability)) {
      bot.capabilities.push(botCapability);
    }
    return ok([Plans.addFeature("Bot")]);
  },
};

const configBot: Action = {
  name: "fx.configBot",
  type: "function",
  plan: () => ok([Plans.addFeature("Bot")]),
  execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    const projectSettings = context.projectSetting;
    const botCapability = featureToCapability.get(
      inputs[AzureSolutionQuestionNames.Features] as string
    );
    // add teams-bot
    projectSettings.components.push({
      name: ComponentNames.TeamsBot,
      hosting: inputs.hosting,
      deploy: true,
      capabilities: botCapability ? [botCapability] : [],
    });
    // add hosting component
    const hostingComponent = {
      name: inputs.hosting,
      connections: [ComponentNames.TeamsBot, ComponentNames.Identity],
      scenario: Scenarios.Bot,
    };
    // connect azure-sql to hosting component
    if (getComponent(context.projectSetting, ComponentNames.AzureSQL)) {
      hostingComponent.connections.push(ComponentNames.AzureSQL);
    }
    projectSettings.components.push(hostingComponent);
    //add bot-service
    projectSettings.components.push({
      name: ComponentNames.BotService,
      provision: true,
    });
    // add default identity
    if (!getComponent(context.projectSetting, ComponentNames.Identity)) {
      projectSettings.components.push({
        name: ComponentNames.Identity,
        provision: true,
      });
    }
    // connect to existing apim
    const apimConfig = getComponent(projectSettings, ComponentNames.APIM);
    if (apimConfig) {
      apimConfig.connections?.push(ComponentNames.TeamsBot);
    }
    projectSettings.programmingLanguage ||= inputs[CoreQuestionNames.ProgrammingLanguage];
    globalVars.isVS = isVSProject(projectSettings);
    return ok([Plans.addFeature("Bot")]);
  },
};

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
const featureToCapability: Map<string, string> = new Map([
  [BotOptionItem.id, "bot"],
  [MessageExtensionItem.id, "message-extension"],
  [M365SearchAppOptionItem.id, "message-extension"],
  [CommandAndResponseOptionItem.id, "command-response"],
  [NotificationOptionItem.id, "notification"],
]);

const featureToScenario: Map<string, (triggers?: string[]) => TemplateProjectsScenarios[]> =
  new Map([
    [BotOptionItem.id, () => [TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME]],
    [NotificationOptionItem.id, (triggers?: string[]) => resolveNotificationScenario(triggers)],
    [
      CommandAndResponseOptionItem.id,
      () => [TemplateProjectsScenarios.COMMAND_AND_RESPONSE_SCENARIO_NAME],
    ],
    [MessageExtensionItem.id, () => [TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME]],
    [M365SearchAppOptionItem.id, () => [TemplateProjectsScenarios.M365_SCENARIO_NAME]],
  ]);

const triggersToScenario: Map<string, TemplateProjectsScenarios[]> = new Map([
  [AppServiceOptionItem.id, [TemplateProjectsScenarios.NOTIFICATION_RESTIFY_SCENARIO_NAME]],
  [AppServiceOptionItemForVS.id, [TemplateProjectsScenarios.NOTIFICATION_WEBAPI_SCENARIO_NAME]],
  [
    FunctionsHttpTriggerOptionItem.id,
    [
      TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME,
      TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_HTTP_SCENARIO_NAME,
    ],
  ],
  [
    FunctionsTimerTriggerOptionItem.id,
    [
      TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME,
      TemplateProjectsScenarios.NOTIFICATION_FUNCTION_TRIGGER_TIMER_SCENARIO_NAME,
    ],
  ],
]);

const resolveNotificationScenario = (triggers?: string[]): TemplateProjectsScenarios[] => {
  if (!Array.isArray(triggers)) {
    return [];
  }
  return ([] as TemplateProjectsScenarios[]).concat(
    ...triggers.map((trigger) => triggersToScenario.get(trigger) ?? [])
  );
};

const resolveHosting: (inputs: InputsWithProjectPath) => string = (inputs): string => {
  let hosting = "azure-web-app";
  const triggers = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] as string[];
  if (
    triggers?.includes(FunctionsHttpTriggerOptionItem.id) ||
    triggers?.includes(FunctionsTimerTriggerOptionItem.id)
  ) {
    hosting = "azure-function";
  }
  return hosting;
};
