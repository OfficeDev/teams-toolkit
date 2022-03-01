// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Result,
  v2,
  v3,
  ok,
  Void,
  err,
  AzureSolutionSettings,
  returnSystemError,
} from "@microsoft/teamsfx-api";
import { Container, Service } from "typedi";
import { BuiltInFeaturePluginNames } from "../../solution/fx-solution/v3/constants";
import fs from "fs-extra";
import { generateBicepFromFile } from "../../../common/tools";
import { Site } from "@azure/arm-appservice/esm/models";
import {
  BotOptionItem,
  AzureSolutionQuestionNames,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import { CommonErrorHandlerMW } from "../../../core/middleware/CommonErrorHandlerMW";
import { hooks } from "@feathersjs/hooks";
import { DotnetPluginPathInfo as PathInfo, ManifestSnippet, WebappBicep } from "./constants";
import { LogMessage } from "./messages";
import { ensureSolutionSettings } from "../../solution/fx-solution/utils/solutionSettingsHelper";
import { AppStudioPluginV3 } from "../appstudio/v3/index";

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
export class DotnetPlugin implements v3.PluginV3 {
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

  pluginDependencies(): Result<string[], FxError> {
    return ok([BuiltInFeaturePluginNames.identity]);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.dotnet } })])
  async addInstance(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<string[], FxError>> {
    ensureSolutionSettings(ctx.projectSetting);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const capabilities = this.getCapabilities(inputs);
    capabilities.forEach((cap) => {
      if (!solutionSettings.capabilities.includes(cap)) {
        solutionSettings.capabilities.push(cap);
      }
    });
    if (capabilities.includes(TabOptionItem.id)) {
      const res = await ctx.appManifestProvider.addCapabilities(ctx, inputs, [
        {
          name: "staticTab",
          snippet: ManifestSnippet.staticTabCapability,
        },
        {
          name: "configurableTab",
          snippet: ManifestSnippet.configurableTabCapability,
        },
      ]);
      if (res.isErr()) return err(res.error);
    }

    if (capabilities.includes(BotOptionItem.id)) {
      const res = await ctx.appManifestProvider.addCapabilities(ctx, inputs, [
        { name: "Bot", snippet: ManifestSnippet.botCapability },
      ]);
      if (res.isErr()) return err(res.error);
    }

    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    const manifest = await appStudioV3.loadManifest(ctx, inputs);
    const res = await manifest.match(
      async (manifest) => {
        manifest.remote.developer = ManifestSnippet.getDeveloperSnippet(
          manifest.remote.developer.name
        );
        return await appStudioV3.saveManifest(ctx, inputs, manifest);
      },
      async (error) => {
        return err(error);
      }
    );
    if (res.isErr()) return err(res.error);

    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return this.pluginDependencies();
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.dotnet } })])
  async generateCode(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.dotnet } })])
  async generateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.AddFeatureInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    // TODO: refactor the logger
    ctx.logProvider.info(`[${this.name}] ${LogMessage.startGenerateResourceTemplate}`);
    const result: v3.BicepTemplate[] = [];
    const newCap = this.getCapabilities(inputs);

    if (!newCap?.length) {
      return err(returnSystemError(new Error("no capability"), this.name, "NoCapability"));
    }

    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const currCap = solutionSettings.capabilities;
    const pluginCtx = {
      plugins: solutionSettings.activeResourcePlugins ?? [],
      capabilities: [...currCap, ...newCap],
    };

    if (!currCap.includes(TabOptionItem.id) && !currCap.includes(BotOptionItem.id)) {
      const webAppBicep = await this.generateWebAppBicep(pluginCtx);
      result.push(webAppBicep);
    }

    if (newCap.includes(BotOptionItem.id) && currCap.includes(TabOptionItem.id)) {
      const updateWebAppBicep = await this.updateWebAppBicep(pluginCtx);
      result.push(updateWebAppBicep);
    }

    if (newCap.includes(BotOptionItem.id) && !currCap.includes(BotOptionItem.id)) {
      const botBicep = await this.generateBotServiceBicep(pluginCtx);
      result.push(botBicep);
    }

    ctx.logProvider.info(`[${this.name}] ${LogMessage.endGenerateResourceTemplate(newCap)}.`);
    return ok(result);
  }

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.dotnet } })])
  async updateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.UpdateInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    ctx.logProvider.info(`[${this.name}] ${LogMessage.startUpdateResourceTemplate}`);
    const capabilities = this.getCapabilities(inputs);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const pluginCtx = {
      plugins: solutionSettings.activeResourcePlugins ?? [],
      capabilities: capabilities,
    };
    const result = await this.updateWebAppBicep(pluginCtx);

    ctx.logProvider.info(`[${this.name}] ${LogMessage.endUpdateResourceTemplate}`);
    return ok([result]);
  }

  private async generateWebAppBicep(pluginCtx: {
    plugins: string[];
    capabilities: string[];
  }): Promise<v3.BicepTemplate> {
    const webappTemplatePaths = [
      PathInfo.webappProvisionOrchestrationPath,
      PathInfo.webappProvisionModulePath,
      PathInfo.webappConfigOrchestrationPath,
      PathInfo.webappConfigModulePath,
    ];
    const bicepSnippets = await Promise.all(
      webappTemplatePaths.map((path) => generateBicepFromFile(path, pluginCtx))
    );

    const result: v3.BicepTemplate = {
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
    return result;
  }

  private async updateWebAppBicep(pluginCtx: {
    plugins: string[];
    capabilities: string[];
  }): Promise<v3.BicepTemplate> {
    const configModule = await generateBicepFromFile(PathInfo.webappConfigModulePath, pluginCtx);
    const result: v3.BicepTemplate = {
      Configuration: {
        Modules: { webapp: configModule },
      },
      Reference: WebappBicep.Reference,
    };
    return result;
  }

  private async generateBotServiceBicep(pluginCtx: {
    plugins: string[];
    capabilities: string[];
  }): Promise<v3.BicepTemplate> {
    const botTemplatePaths = [
      PathInfo.botProvisionOrchestrationPath,
      PathInfo.botProvisionModulePath,
    ];
    const bicepSnippets = await Promise.all(
      botTemplatePaths.map((path) => generateBicepFromFile(path, pluginCtx))
    );

    const result: v3.BicepTemplate = {
      Provision: {
        Orchestration: bicepSnippets[0],
        Modules: { botservice: bicepSnippets[1] },
      },
      Parameters: JSON.parse(await fs.readFile(PathInfo.botParameterPath, "utf-8")),
      Reference: WebappBicep.Reference,
    };
    return result;
  }
}
