// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Result,
  v2,
  v3,
  ok,
  AzureAccountProvider,
  Void,
  err,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../../common/armInterface";
import { BuiltInFeaturePluginNames } from "../../solution/fx-solution/v3/constants";
import path from "path";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../../folder";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../common/tools";
import { Bicep } from "../../../common/constants";
import { Site } from "@azure/arm-appservice/esm/models";
import * as Deploy from "./deploy";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import {
  BotOptionItem,
  MessageExtensionItem,
  TabOptionItem,
  AzureSolutionQuestionNames,
} from "../../solution/fx-solution/question";
import { CommonErrorHandlerMW } from "../../../core/middleware/CommonErrorHandlerMW";
import { hooks } from "@feathersjs/hooks/lib";

export interface DotnetPluginConfig {
  /* Config from solution */
  resourceGroupName?: string;
  subscriptionId?: string;
  resourceNameSuffix?: string;
  location?: string;

  /* Config exported by Dotnet plugin */
  webAppName?: string;
  appServicePlanName?: string;
  endpoint?: string;
  domain?: string;
  projectFilePath?: string;
  webAppResourceId?: string;

  /* Intermediate  */
  site?: Site;
}

export enum ConfigKey {
  /* Config from solution */
  resourceGroupName = "resourceGroupName",
  subscriptionId = "subscriptionId",
  resourceNameSuffix = "resourceNameSuffix",
  location = "location",
  credential = "credential",
  teamsAppName = "teamsAppName",
  projectDir = "dir",
  buildPath = "buildPath",

  /* Config exported by Dotnet plugin */
  webAppName = "webAppName",
  webAppEndpoint = "webAppEndpoint",
  webAppDomain = "webAppDomain",
  webAppResourceId = "webAppResourceId",

  /* Intermediate */
  site = "site",
}

export class WebappBicep {
  static readonly endpoint = "provisionOutputs.webappOutput.value.endpoint";
  static readonly resourceId = "provisionOutputs.webappOutput.value.resourceId";
  static readonly domain = "provisionOutputs.webappOutput.value.domain";
  static readonly endpointAsParam = "webappProvision.outputs.endpoint";
  static readonly domainAsParam = "webappProvision.outputs.domain";

  static readonly Reference = {
    webappResourceId: WebappBicep.resourceId,
    endpoint: WebappBicep.endpoint,
    domain: WebappBicep.domain,
    endpointAsParam: WebappBicep.endpointAsParam,
    domainAsParam: WebappBicep.domainAsParam,
  };
}

@Service(BuiltInFeaturePluginNames.dotnet)
export class DotnetPlugin implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.dotnet;
  displayName = "ASP.Net App";
  description = "ASP.Net App";

  private checkAndGet<T>(v: T | undefined, key: string) {
    if (v) {
      return v;
    }
    throw new Error(`Failed to fetch config ${key}`);
  }

  private getCapabilities(inputs: v2.InputsWithProjectPath): string[] {
    return (inputs[AzureSolutionQuestionNames.Capabilities] as string[]) ?? [];
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    const armResult = await this.generateResourceTemplate(ctx, inputs);
    if (armResult.isErr()) return err(armResult.error);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const capabilities = solutionSettings.capabilities;
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!capabilities.includes(TabOptionItem.id)) capabilities.push(TabOptionItem.id);
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok(armResult.value);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void | undefined, FxError>> {
    return ok(Void);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async generateBotServiceTemplate(pluginCtx: {
    plugins: string[];
    capabilities: string[];
  }): Promise<v2.ResourceTemplate> {
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "botservice",
      "bicep"
    );
    const provisionTemplateFilePath = path.join(bicepTemplateDir, Bicep.ProvisionFileName);
    const provisionBotTemplateFilePath = path.join(
      bicepTemplateDir,
      "botServiceProvision.template.bicep"
    );
    const provisionOrchestration = await generateBicepFromFile(
      provisionTemplateFilePath,
      pluginCtx
    );
    const provisionModule = await generateBicepFromFile(provisionBotTemplateFilePath, pluginCtx);
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { botservice: provisionModule },
      },
      Parameters: JSON.parse(
        await fs.readFile(path.join(bicepTemplateDir, Bicep.ParameterFileName), "utf-8")
      ),
    };
    return { kind: "bicep", template: result };
  }

  async generateWebAppTemplate(pluginCtx: {
    plugins: string[];
    capabilities: string[];
  }): Promise<v2.ResourceTemplate> {
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "webapp",
      "bicep"
    );
    const provisionTemplateFilePath = path.join(bicepTemplateDir, Bicep.ProvisionFileName);
    const provisionWebappTemplateFilePath = path.join(
      bicepTemplateDir,
      "webappProvision.template.bicep"
    );
    const configTemplateFilePath = path.join(bicepTemplateDir, Bicep.ConfigFileName);
    const configWebappTemplateFilePath = path.join(
      bicepTemplateDir,
      "webappConfiguration.template.bicep"
    );

    const provisionOrchestration = await generateBicepFromFile(
      provisionTemplateFilePath,
      pluginCtx
    );
    const provisionModule = await generateBicepFromFile(provisionWebappTemplateFilePath, pluginCtx);
    const configOrchestration = await generateBicepFromFile(configTemplateFilePath, pluginCtx);
    const configModule = await generateBicepFromFile(configWebappTemplateFilePath, pluginCtx);

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { webapp: provisionModule },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { webapp: configModule },
      },
      Reference: WebappBicep.Reference,
    };
    return { kind: "bicep", template: result };
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    ctx.logProvider.info(`[${this.name}] Start generating resource template.`);
    const result: v2.ResourceTemplate[] = [];
    const capabilities = this.getCapabilities(inputs);

    if (!capabilities?.length) {
      throw new Error("no capability");
    }

    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const pluginCtx = {
      plugins: solutionSettings.activeResourcePlugins ?? [],
      capabilities: capabilities,
    };

    const webAppBicep = await this.generateWebAppTemplate(pluginCtx);
    result.push({ kind: "bicep", template: webAppBicep });

    if (capabilities.includes(BotOptionItem.id) || capabilities.includes(MessageExtensionItem.id)) {
      const botBicep = await this.generateBotServiceTemplate(pluginCtx);
      result.push(botBicep);
    }

    ctx.logProvider.info(
      `[${this.name}] Successfully generated resource template for ${capabilities.join(", ")}.`
    );
    return ok(result);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async afterOtherFeaturesAdded(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.OtherFeaturesAddedInputs
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    return await this.updateResourceTemplate(ctx, inputs);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async updateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    ctx.logProvider.info(`[${this.name}] Start generating Arm template`);
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "webapp",
      "bicep"
    );
    const configWebappTemplateFilePath = path.join(
      bicepTemplateDir,
      "webappConfiguration.template.bicep"
    );

    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const pluginCtx = { plugins: solutionSettings.activeResourcePlugins ?? [] };
    const configModule = await generateBicepFromFile(configWebappTemplateFilePath, pluginCtx);
    const result: ArmTemplateResult = {
      Reference: WebappBicep.Reference,
      Configuration: {
        Modules: { webapp: configModule },
      },
    };

    ctx.logProvider.info(`[${this.name}] Successfully updated Arm template`);
    return ok([{ kind: "bicep", template: result }]);
  }

  private buildConfig(envInfo: v2.DeepReadonly<v3.EnvInfoV3>) {
    const config: DotnetPluginConfig = {};
    const solutionConfig = envInfo.state.solution as v3.AzureSolutionConfig;
    config.resourceGroupName = solutionConfig.resourceGroupName;
    config.subscriptionId = solutionConfig.subscriptionId;

    const webApp = envInfo.state[this.name] as v3.AzureResource;
    config.webAppName = webApp.resourceName;

    // Resource id priors to other configs
    const webAppResourceId = webApp.resourceId;
    if (webAppResourceId) {
      config.webAppResourceId = webAppResourceId;
      config.resourceGroupName = getResourceGroupNameFromResourceId(webAppResourceId);
      config.webAppName = getSiteNameFromResourceId(webAppResourceId);
      config.subscriptionId = getSubscriptionIdFromResourceId(webAppResourceId);
    }
    return config;
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(`[${this.name}] Start deploying`);
    const progress = ctx.userInteraction.createProgressBar("deploy", 2);
    await progress.start("Start");

    const config = this.buildConfig(envInfo);

    const webAppName = this.checkAndGet(config.webAppName, ConfigKey.webAppName);
    const resourceGroupName = this.checkAndGet(
      config.resourceGroupName,
      ConfigKey.resourceGroupName
    );
    const subscriptionId = this.checkAndGet(config.subscriptionId, ConfigKey.subscriptionId);
    const credential = this.checkAndGet(
      await tokenProvider?.getAccountCredentialAsync(),
      ConfigKey.credential
    );

    const projectPath = this.checkAndGet(inputs.dir, ConfigKey.projectDir);
    const client = new WebSiteManagementClient(credential, subscriptionId);

    // await Deploy.build(projectPath, runtime);

    const folderToBeZipped = this.checkAndGet(inputs.buildPath, ConfigKey.buildPath);
    if (!(await fs.pathExists(folderToBeZipped))) {
      throw new Error(`Built path not found: ${folderToBeZipped}`);
    }
    await Deploy.zipDeploy(
      client,
      resourceGroupName,
      webAppName,
      path.resolve(projectPath, folderToBeZipped)
    );

    ctx.logProvider.info(`[${this.name}] Successfully deployed`);
    return ok(Void);
  }
}
