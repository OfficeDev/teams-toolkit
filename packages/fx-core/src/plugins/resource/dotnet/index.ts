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
  AzureSolutionQuestionNames,
} from "../../solution/fx-solution/question";
import { CommonErrorHandlerMW } from "../../../core/middleware/CommonErrorHandlerMW";
import { hooks } from "@feathersjs/hooks";
import { DotnetPluginPathInfo as PathInfo, WebappBicep } from "./constants";
import { ConfigKey } from "./enums";
import { LogMessage, ProgressMessage } from "./messages";

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
    const scaffoldResult = await this.scaffold(ctx, inputs);
    if (scaffoldResult.isErr()) return err(scaffoldResult.error);
    const armResult = await this.generateResourceTemplate(ctx, inputs);
    if (armResult.isErr()) return err(armResult.error);

    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const capabilities = this.getCapabilities(inputs);
    capabilities.forEach((cap) => {
      if (!solutionSettings.capabilities.includes(cap)) {
        solutionSettings.capabilities.push(cap);
      }
    });
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
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
    const botTemplatePaths = [
      PathInfo.botProvisionOrchestrationPath,
      PathInfo.botProvisionModulePath,
    ];
    const bicepSnippets = await Promise.all(
      botTemplatePaths.map((path) => generateBicepFromFile(path, pluginCtx))
    );

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: bicepSnippets[0],
        Modules: { botservice: bicepSnippets[1] },
      },
      Parameters: JSON.parse(
        await fs.readFile(path.join(PathInfo.botBicepTemplateDir, Bicep.ParameterFileName), "utf-8")
      ),
    };
    return { kind: "bicep", template: result };
  }

  async generateWebAppTemplate(pluginCtx: {
    plugins: string[];
    capabilities: string[];
  }): Promise<v2.ResourceTemplate> {
    const webappTemplatePaths = [
      PathInfo.webappProvisionOrchestrationPath,
      PathInfo.webappProvisionModulePath,
      PathInfo.webappConfigOrchestrationPath,
      PathInfo.webappConfigModulePath,
    ];
    const bicepSnippets = await Promise.all(
      webappTemplatePaths.map((path) => generateBicepFromFile(path, pluginCtx))
    );

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: bicepSnippets[0],
        Modules: { webapp: bicepSnippets[1] },
      },
      Configuration: {
        Orchestration: bicepSnippets[2],
        Modules: { webapp: bicepSnippets[3] },
      },
      Reference: WebappBicep.Reference,
    };
    return { kind: "bicep", template: result };
  }

  // TODO: need to cover add capability scenario
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.frontend } })])
  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    // TODO: refactor the logger
    ctx.logProvider.info(`[${this.name}] ${LogMessage.startGenerateResourceTemplate}`);
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

    ctx.logProvider.info(`[${this.name}] ${LogMessage.endGenerateResourceTemplate(capabilities)}.`);
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
    ctx.logProvider.info(`[${this.name}] ${LogMessage.startUpdateResourceTemplate}`);
    const capabilities = this.getCapabilities(inputs);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const pluginCtx = {
      plugins: solutionSettings.activeResourcePlugins ?? [],
      capabilities: capabilities,
    };
    const configModule = await generateBicepFromFile(PathInfo.webappConfigModulePath, pluginCtx);
    const result: ArmTemplateResult = {
      Reference: WebappBicep.Reference,
      Configuration: {
        Modules: { webapp: configModule },
      },
    };

    ctx.logProvider.info(`[${this.name}] ${LogMessage.endUpdateResourceTemplate}`);
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
    ctx.logProvider.info(`[${this.name}] ${LogMessage.startDeploy}`);
    const progress = ctx.userInteraction.createProgressBar(ProgressMessage.deployProgressTitle, 2);
    await progress?.start(ProgressMessage.startProgress);

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

    progress?.next(ProgressMessage.building);
    const runtime = this.checkAndGet(inputs.runtime, ConfigKey.runtime);
    await Deploy.build(projectPath, runtime);

    progress?.next(ProgressMessage.uploading);
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

    progress?.end(true);
    ctx.logProvider.info(`[${this.name}] ${LogMessage.endDeploy}`);
    return ok(Void);
  }
}
