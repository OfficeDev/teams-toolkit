// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  Json,
  ok,
  Result,
  TokenProvider,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import {
  Context,
  DeepReadonly,
  DeploymentInputs,
  EnvInfoV2,
  ProvisionInputs,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { scaffold } from "./scaffold";
import * as utils from "../utils/common";
import { HostTypeTriggerOptions } from "../question";
import path from "path";
import { AzureHostingFactory } from "../../../../common/azure-hosting/hostingFactory";
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
  BotTrigger,
  PluginBot,
  QuestionBotScenarioToPluginActRoles,
  CommonStrings,
  Commands,
} from "../resources/strings";
import { CodeTemplateInfo } from "./interface/codeTemplateInfo";
import { CommandExecutionError } from "../errors";
import { BicepConfigs, HostType } from "../../../../common/azure-hosting/interfaces";
import { mergeTemplates } from "../../../../common/azure-hosting/utils";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { ResourcePlugins } from "../../../../common/constants";

export class TeamsBotV2Impl {
  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    const workingPath = path.join(inputs.projectPath ?? "", "bot");
    const hostTypeTriggers = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER];
    let hostType;
    if (Array.isArray(hostTypeTriggers)) {
      const hostTypes = hostTypeTriggers.map(
        (item) => HostTypeTriggerOptions.find((option) => option.id === item)?.hostType
      );
      hostType = hostTypes ? hostTypes[0] : undefined;
    }
    utils.checkAndSavePluginSettingV2(ctx, PluginBot.HOST_TYPE, hostType);

    const templates = this.getTemplates(ctx, inputs);
    await Promise.all(
      templates.map(async (template) => {
        await scaffold(template, workingPath);
      })
    );

    return ok(Void);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const bicepConfigs = this.getBicepConfigs(ctx, inputs);
    const bicepContext = {
      plugins: plugins.map((obj) => obj.name),
      configs: bicepConfigs,
    };

    const hostTypes = [this.resolveHostType(ctx), HostType.BotService];
    const templates = await Promise.all(
      hostTypes.map((hostType) => {
        const hosting = AzureHostingFactory.createHosting(hostType);
        return hosting.generateBicep(bicepContext, ResourcePlugins.Bot);
      })
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const bicepConfigs = this.getBicepConfigs(ctx, inputs);
    const bicepContext = {
      plugins: plugins.map((obj) => obj.name),
      configs: bicepConfigs,
    };

    const hostTypes = [this.resolveHostType(ctx), HostType.BotService];
    const templates = await Promise.all(
      hostTypes.map((hostType) => {
        const hosting = AzureHostingFactory.createHosting(hostType);
        return hosting.updateBicep(bicepContext, ResourcePlugins.Bot);
      })
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
  }

  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    const packDir = await this.localBuild(ctx, inputs);
    // TODO: zip packDir and upload to Azure Web App or Azure Function
    return ok(Void);
  }

  async provisionLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: EnvInfoV2
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async configureLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: v2.EnvInfoV2 | undefined
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  private getTemplates(ctx: Context, inputs: Inputs): CodeTemplateInfo[] {
    const actRoles = this.resolveActRoles(ctx, inputs);
    const triggers = this.resolveTriggers(inputs);
    const hostType = this.resolveHostType(ctx);
    const lang = this.resolveProgrammingLanguage(ctx);
    const isM365 = ctx.projectSetting?.isM365;

    const scenarios = this.resolveScenarios(actRoles, triggers, hostType, isM365);

    return scenarios.map((scenario) => {
      return {
        group: TemplateProjectsConstants.GROUP_NAME_BOT,
        language: lang,
        scenario: scenario,
        variables: {},
      };
    });
  }

  private getBicepConfigs(ctx: Context, inputs: Inputs): BicepConfigs {
    const lang = this.resolveProgrammingLanguage(ctx);

    const bicepConfigs: BicepConfigs = [];

    if (lang === "js" || lang === "ts") {
      bicepConfigs.push("node");
    }
    if (lang === "csharp") {
      bicepConfigs.push("dotnet");
    }

    bicepConfigs.push("running-on-azure");

    return bicepConfigs;
  }

  private async localBuild(ctx: Context, inputs: Inputs): Promise<string> {
    // Return the folder path to be zipped and uploaded

    const lang = this.resolveProgrammingLanguage(ctx);
    const packDir = path.join(inputs.projectPath!, CommonStrings.BOT_WORKING_DIR_NAME);
    if (lang === "ts") {
      //Typescript needs tsc build before deploy because of windows app server. other languages don"t need it.
      try {
        await utils.execute("npm install", packDir);
        await utils.execute("npm run build", packDir);
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL},${Commands.NPM_BUILD}`, e);
      }
    }

    if (lang === "js") {
      try {
        // fail to npm install @microsoft/teamsfx on azure web app, so pack it locally.
        await utils.execute("npm install", packDir);
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`${Commands.NPM_INSTALL}`, e);
      }
    }

    if (lang === "csharp") {
      try {
        // TODO: build csharp project
        await utils.execute("dotnet publish", packDir);
        return packDir;
      } catch (e) {
        throw new CommandExecutionError(`dotnet publish`, e);
      }
    }

    throw new Error("Invalid programming language");
  }

  private resolveActRoles(ctx: Context, inputs: Inputs): PluginActRoles[] {
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

  private resolveHostType(ctx: Context): HostType {
    const rawHostType = ctx.projectSetting?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
      PluginBot.HOST_TYPE
    ] as string;

    switch (rawHostType) {
      case "app-service":
        return HostType.AppService;
      case "azure-functions":
        return HostType.Function;
      case undefined:
        return HostType.AppService;
    }
    throw new Error("Invalid host type");
  }

  private resolveTriggers(inputs: Inputs): BotTrigger[] {
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

  private resolveProgrammingLanguage(ctx: Context): string {
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

  private resolveScenarios(
    actRoles: PluginActRoles[],
    triggers: BotTrigger[],
    hostType: HostType,
    isM365: boolean | undefined
  ): string[] {
    const scenarios: string[] = [];
    actRoles.map((actRole) => {
      switch (actRole) {
        case PluginActRoles.CommandAndResponse:
          scenarios.push(TemplateProjectsScenarios.COMMAND_AND_RESPONSE_SCENARIO_NAME);
          break;
        case PluginActRoles.Notification:
          if (hostType === HostType.Function) {
            scenarios.push(TemplateProjectsScenarios.NOTIFICATION_FUNCTION_BASE_SCENARIO_NAME);
            triggers.map((trigger) => scenarios.push(TriggerTemplateScenarioMappings[trigger]));
          }
          if (hostType === HostType.AppService) {
            scenarios.push(TemplateProjectsScenarios.NOTIFICATION_RESTIFY_SCENARIO_NAME);
          }
          break;
        case PluginActRoles.Bot:
        case PluginActRoles.MessageExtension:
          if (isM365) {
            scenarios.push(TemplateProjectsScenarios.M365_SCENARIO_NAME);
          } else if (!scenarios.includes(TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME)) {
            scenarios.push(TemplateProjectsScenarios.DEFAULT_SCENARIO_NAME);
          }
          break;
      }
    });

    return scenarios;
  }
}

export default new TeamsBotV2Impl();
