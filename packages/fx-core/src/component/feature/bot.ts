// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  Effect,
  err,
  FunctionAction,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Platform,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import { assign, cloneDeep } from "lodash";
import "reflect-metadata";
import { Service } from "typedi";
import { format } from "util";
import { getLocalizedString } from "../../common/localizeUtils";
import { isVSProject } from "../../common/projectSettingsHelper";
import { globalVars } from "../../core/globalVars";
import { CoreQuestionNames } from "../../core/question";
import { QuestionNames, TemplateProjectsScenarios } from "../../plugins/resource/bot/constants";
import {
  AppServiceOptionItem,
  AppServiceOptionItemForVS,
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
} from "../../plugins/resource/bot/question";
import { CommonStrings } from "../../plugins/resource/bot/resources/strings";
import {
  BotOptionItem,
  CommandAndResponseOptionItem,
  M365SearchAppOptionItem,
  MessageExtensionItem,
  NotificationOptionItem,
} from "../../plugins/solution/fx-solution/question";
import "../connection/azureWebAppConfig";
import { ComponentNames, Scenarios } from "../constants";
import { Plans } from "../messages";
import "../resource/appManifest/appManifest";
import "../resource/azureAppService/azureWebApp";
import "../resource/botService";
import { generateConfigBiceps } from "../utils";
import { getComponent, getComponentByScenario, runActionByName } from "../workflow";
@Service("teams-bot")
export class TeamsBot {
  name = "teams-bot";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: FunctionAction = {
      name: `${this.name}.add`,
      type: "function",
      plan: (context, inputs) => {
        return ok(["add Bot to project"]);
      },
      execute: async (context, inputs) => {
        const projectSettings = context.projectSetting;
        const effects: Effect[] = [];
        const botCapability = featureToCapability.get(inputs[CoreQuestionNames.Features] as string);
        inputs.hosting = resolveHosting(inputs);
        inputs[CoreQuestionNames.ProgrammingLanguage] =
          context.projectSetting.programmingLanguage ||
          inputs[CoreQuestionNames.ProgrammingLanguage] ||
          "javascript";

        let botConfig = getComponent(projectSettings, ComponentNames.TeamsBot);

        // bot can only add once
        if (botConfig) {
          return ok(effects);
        }

        // 1. scaffold bot and add bot config
        {
          const clonedInputs = cloneDeep(inputs);
          const scenarios = featureToScenario.get(inputs[CoreQuestionNames.Features])?.(
            inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER]
          );
          const language =
            inputs?.["programming-language"] ||
            context.projectSetting.programmingLanguage ||
            "javascript";
          const folder = language === "csharp" ? "" : CommonStrings.BOT_WORKING_DIR_NAME;
          assign(clonedInputs, {
            folder: folder,
            scenarios: scenarios,
            language: inputs[CoreQuestionNames.ProgrammingLanguage],
          });
          const res = await runActionByName("bot-code.generate", context, clonedInputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate bot code");
          botConfig = {
            name: ComponentNames.TeamsBot,
            hosting: inputs.hosting,
            deploy: true,
            capabilities: botCapability ? [botCapability] : [],
            build: true,
            folder: folder,
          };
          projectSettings.components.push(botConfig);
          effects.push(Plans.generateSourceCodeAndConfig(ComponentNames.TeamsBot));
        }

        // 2. generate provision bicep
        // 2.0 bicep.init
        {
          const res = await runActionByName("bicep.init", context, inputs);
          if (res.isErr()) return err(res.error);
        }

        // 2.1 bot-service bicep
        if (!getComponent(projectSettings, ComponentNames.BotService)) {
          const clonedInputs = cloneDeep(inputs);
          assign(clonedInputs, {
            hosting: inputs.hosting,
            scenario: Scenarios.Bot,
          });
          const res = await runActionByName("bot-service.generateBicep", context, clonedInputs);
          if (res.isErr()) return err(res.error);
          projectSettings.components.push({
            name: ComponentNames.BotService,
            provision: true,
          });
          effects.push(Plans.generateBicepAndConfig(ComponentNames.BotService));
        }

        // 2.2 hosting bicep
        const hostingConfig = getComponentByScenario(
          projectSettings,
          inputs.hosting,
          Scenarios.Bot
        );
        if (!hostingConfig) {
          const clonedInputs = cloneDeep(inputs);
          assign(clonedInputs, {
            componentId: ComponentNames.TeamsBot,
            scenario: Scenarios.Bot,
          });
          const res = await runActionByName(
            inputs.hosting + ".generateBicep",
            context,
            clonedInputs
          );
          if (res.isErr()) return err(res.error);
          projectSettings.components.push({
            name: inputs.hosting,
            scenario: Scenarios.Bot,
          });
          effects.push(Plans.generateBicepAndConfig(inputs.hosting));
        }

        // 2.3 identity bicep
        if (!getComponent(projectSettings, ComponentNames.Identity)) {
          const clonedInputs = cloneDeep(inputs);
          assign(clonedInputs, {
            componentId: "",
            scenario: "",
          });
          const res = await runActionByName("identity.generateBicep", context, clonedInputs);
          if (res.isErr()) return err(res.error);
          projectSettings.components.push({
            name: ComponentNames.Identity,
            provision: true,
          });
          effects.push(Plans.generateBicepAndConfig(ComponentNames.Identity));
        }

        // 3. generate config bicep
        {
          const res = await generateConfigBiceps(context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate config biceps");
        }

        // 4. local debug settings
        {
          const res = await runActionByName("debug.generateLocalDebugSettings", context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate local debug configs");
        }

        // 5. app-manifest.addCapability
        {
          const manifestCapability: v3.ManifestCapability = {
            name:
              inputs[CoreQuestionNames.Features] === MessageExtensionItem.id
                ? "MessageExtension"
                : "Bot",
          };
          const clonedInputs = cloneDeep(inputs);
          assign(clonedInputs, {
            capabilities: [manifestCapability],
          });
          const res = await runActionByName("app-manifest.addCapability", context, clonedInputs);
          if (res.isErr()) return err(res.error);
          effects.push("add bot capability in app manifest");
        }

        globalVars.isVS = isVSProject(projectSettings);
        projectSettings.programmingLanguage ||= inputs[CoreQuestionNames.ProgrammingLanguage];

        const msg =
          inputs.platform === Platform.CLI
            ? getLocalizedString("core.addCapability.addCapabilityNoticeForCli")
            : getLocalizedString("core.addCapability.addCapabilitiesNoticeForCli");
        context.userInteraction.showMessage("info", format(msg, "Bot"), false);
        return ok(effects);
      },
    };
    return ok(action);
  }
  build(): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(this.buildBotAction());
  }

  // /**
  //  * 1. config bot in project settings
  //  * 2. generate bot source code
  //  * 3. generate bot-service and hosting bicep
  //  * 3. overwrite hosting config bicep
  //  * 4. persist bicep
  //  * 5. add capability in teams manifest
  //  */
  // addBotAction(context: ContextV3, inputs: InputsWithProjectPath): Action {
  //   const actions: Action[] = [];
  //   this.setupCode(actions, context);
  //   this.setupBicep(actions, context, inputs);
  //   this.setupManifest(actions);
  //   this.setupConfiguration(actions);
  //   return {
  //     type: "group",
  //     name: "teams-bot.add",
  //     mode: "sequential",
  //     actions: actions,
  //   };
  // }
  buildBotAction(): Action {
    return {
      name: "teams-bot.build",
      type: "call",
      targetAction: "bot-code.build",
      required: true,
    };
  }

  // private setupConfiguration(actions: Action[]): Action[] {
  //   actions.push(configBot);
  //   return actions;
  // }

  // private setupCode(actions: Action[], context: ContextV3): Action[] {
  //   if (hasBot(context.projectSetting)) {
  //     return actions;
  //   }
  //   actions.push(generateBotCode);
  //   actions.push(initLocalDebug);
  //   return actions;
  // }

  // private setupBicep(
  //   actions: Action[],
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): Action[] {
  //   if (hasBot(context.projectSetting)) {
  //     return actions;
  //   }
  //   const hosting = resolveHosting(inputs);
  //   actions.push(initBicep);
  //   actions.push(generateBotService(hosting));
  //   actions.push(generateHosting(hosting, this.name));
  //   actions.push(configHosting(hosting, this.name));
  //   // Configure apim if it exists, create identity if it does not exist
  //   actions.push(configApim);
  //   actions.push(identityAction);
  //   return actions;
  // }

  // private setupManifest(actions: Action[]): Action[] {
  //   actions.push(addCapabilities);
  //   return actions;
  // }
}

// function hasBot(projectSetting: ProjectSettingsV3): boolean {
//   return getComponent(projectSetting, ComponentNames.TeamsBot) != undefined;
// }

// const addCapabilities: Action = {
//   name: "call:app-manifest.addCapability",
//   type: "call",
//   required: true,
//   targetAction: "app-manifest.addCapability",
//   pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
//     const manifestCapability: v3.ManifestCapability = {
//       name:
//         inputs[CoreQuestionNames.Features] === MessageExtensionItem.id ? "MessageExtension" : "Bot",
//     };
//     inputs.capabilities = [manifestCapability];
//     return ok(undefined);
//   },
// };

// const initBicep: Action = {
//   type: "call",
//   targetAction: "bicep.init",
//   required: true,
// };

// const generateBotService: (hosting: string) => Action = (hosting) => ({
//   name: "call:bot-service.generateBicep",
//   type: "call",
//   required: true,
//   targetAction: "bot-service.generateBicep",
//   inputs: {
//     hosting: hosting,
//     scenario: "Bot",
//   },
//   post: (context) => {
//     context.projectSetting.components.push({
//       name: ComponentNames.BotService,
//       provision: true,
//     });
//     return ok(undefined);
//   },
// });

// const generateHosting: (hosting: string, componentId: string) => Action = (
//   hosting,
//   componentId
// ) => ({
//   name: `call:${hosting}.generateBicep`,
//   type: "call",
//   required: true,
//   targetAction: `${hosting}.generateBicep`,
//   inputs: {
//     componentId: componentId,
//     scenario: "Bot",
//   },
//   post: (context) => {
//     context.projectSetting.components.push({
//       name: hosting,
//       connections: [ComponentNames.TeamsBot],
//       scenario: Scenarios.Bot,
//     });
//     ensureComponentConnections(context.projectSetting);
//     return ok(undefined);
//   },
// });

// const configHosting: (hosting: string, componentId: string) => Action = (hosting, componentId) => ({
//   name: `call:${hosting}-config.generateBicep`,
//   type: "call",
//   required: true,
//   targetAction: `${hosting}-config.generateBicep`,
//   inputs: {
//     componentId: componentId,
//     scenario: "Bot",
//   },
// });

// const generateBotCode: Action = {
//   name: "call:bot-code.generate",
//   type: "call",
//   required: true,
//   targetAction: "bot-code.generate",
//   inputs: {
//     folder: "bot",
//   },
//   pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
//     const scenarios = featureToScenario.get(inputs[CoreQuestionNames.Features])?.(
//       inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER]
//     );
//     inputs.scenarios = scenarios;
//     return ok(undefined);
//   },
// };

// const configApim: CallAction = {
//   name: "call:apim-config.generateBicep",
//   type: "call",
//   required: true,
//   targetAction: "apim-config.generateBicep",
// };

// const initLocalDebug: Action = {
//   name: "call:debug.generateLocalDebugSettings",
//   type: "call",
//   required: true,
//   targetAction: "debug.generateLocalDebugSettings",
// };

// const configBot: Action = {
//   name: "fx.configBot",
//   type: "function",
//   plan: () => ok([Plans.addFeature("Bot")]),
//   execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
//     const projectSettings = context.projectSetting;
//     const botCapability = featureToCapability.get(inputs[CoreQuestionNames.Features] as string);
//     // add teams-bot
//     const botConfig = getComponent(projectSettings, ComponentNames.TeamsBot);
//     if (botConfig) {
//       if (botCapability && !botConfig.capabilities.includes(botCapability)) {
//         botConfig.capabilities.push(botCapability);
//       }
//       return ok([Plans.addFeature("Bot")]);
//     }

//     projectSettings.components.push({
//       name: ComponentNames.TeamsBot,
//       hosting: inputs.hosting,
//       deploy: true,
//       capabilities: botCapability ? [botCapability] : [],
//       build: true,
//       folder: "bot",
//     });
//     ensureComponentConnections(projectSettings);
//     projectSettings.programmingLanguage ||= inputs[CoreQuestionNames.ProgrammingLanguage];
//     globalVars.isVS = isVSProject(projectSettings);
//     return ok([Plans.addFeature("Bot")]);
//   },
// };

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
