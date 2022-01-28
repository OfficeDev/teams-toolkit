// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginContext,
  ok,
  ReadonlyPluginConfig,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import {
  DotnetPluginInfo as PluginInfo,
  DotnetConfigInfo as ConfigInfo,
  DependentPluginInfo,
  DotnetSupportCapability,
  DotnetPathInfo as PathInfo,
  WebappBicepFile,
  WebappBicep,
} from "./constants";
import { Messages } from "./resources/messages";
import { scaffoldFromZipPackage } from "./ops/scaffold";
import { TeamsFxResult } from "./error-factory";
import { WebSiteManagementModels } from "@azure/arm-appservice";
import { AzureClientFactory } from "./utils/azure-client";
import { DotnetConfigKey as ConfigKey } from "./enum";
import { FetchConfigError, ProjectPathError, runWithErrorCatchAndThrow } from "./resources/errors";
import * as Deploy from "./ops/deploy";
import { Logger } from "../utils/logger";
import path from "path";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../../../folder";
import {
  generateBicepFromFile,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../../common/tools";
import { TemplateInfo, Group, TemplateVariable } from "./resources/templateInfo";
import { Bicep } from "../../../../common/constants";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { PluginImpl } from "../interface";
import { Func } from "@microsoft/teamsfx-api";

type Site = WebSiteManagementModels.Site;

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

export class DotnetPluginImpl implements PluginImpl {
  config: DotnetPluginConfig = {};

  private syncConfigFromContext(ctx: PluginContext): void {
    const solutionConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.solutionPluginName
    );
    this.config.resourceGroupName = solutionConfig?.get(
      DependentPluginInfo.resourceGroupName
    ) as string;
    this.config.subscriptionId = solutionConfig?.get(DependentPluginInfo.subscriptionId) as string;

    this.config.webAppName = ctx.config.get(ConfigInfo.webAppName) as string;
    this.config.appServicePlanName = ctx.config.get(ConfigInfo.appServicePlanName) as string;
    this.config.projectFilePath = ctx.config.get(ConfigInfo.projectFilePath) as string;

    // Resource id priors to other configs
    const webAppResourceId = ctx.config.get(ConfigKey.webAppResourceId) as string;
    if (webAppResourceId) {
      this.config.webAppResourceId = webAppResourceId;
      this.config.resourceGroupName = getResourceGroupNameFromResourceId(webAppResourceId);
      this.config.webAppName = getSiteNameFromResourceId(webAppResourceId);
      this.config.subscriptionId = getSubscriptionIdFromResourceId(webAppResourceId);
    }
  }

  private checkAndGet<T>(v: T | undefined, key: string) {
    if (v) {
      return v;
    }
    throw new FetchConfigError(key);
  }

  public async scaffold(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartScaffold(PluginInfo.displayName));

    const selectedCapabilities = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .capabilities;
    const includeTab = selectedCapabilities.includes(DotnetSupportCapability.tabCapability);
    const includeBot = selectedCapabilities.includes(DotnetSupportCapability.botCapability);
    const projectName = ctx.projectSettings!.appName;

    const templateVariable: TemplateVariable = { BlazorAppServer: projectName };

    if (includeTab) {
      templateVariable.IS_TAB = "true";
      const templateInfo = new TemplateInfo(ctx, Group.Tab, templateVariable);
      await scaffoldFromZipPackage(ctx.root, templateInfo);
    }
    if (includeBot) {
      templateVariable.IS_BOT = "true";
      const templateInfo = new TemplateInfo(ctx, Group.Bot, templateVariable);
      await scaffoldFromZipPackage(ctx.root, templateInfo);
    }
    const templateInfo = new TemplateInfo(ctx, Group.Base, templateVariable);
    await scaffoldFromZipPackage(ctx.root, templateInfo);

    Logger.info(Messages.EndScaffold(PluginInfo.displayName));
    return ok(undefined);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    const bicepTemplateDirectory = PathInfo.bicepTemplateFolder(getTemplatesFolder());

    const provisionTemplateFilePath = path.join(bicepTemplateDirectory, Bicep.ProvisionFileName);
    const provisionWebappTemplateFilePath = path.join(
      bicepTemplateDirectory,
      WebappBicepFile.provisionTemplateFileName
    );

    const configTemplateFilePath = path.join(bicepTemplateDirectory, Bicep.ConfigFileName);
    const configWebappTemplateFilePath = path.join(
      bicepTemplateDirectory,
      WebappBicepFile.configurationTemplateFileName
    );

    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };

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
    return ok(result);
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<TeamsFxResult> {
    const bicepTemplateDirectory = PathInfo.bicepTemplateFolder(getTemplatesFolder());
    const configWebappTemplateFilePath = path.join(
      bicepTemplateDirectory,
      WebappBicepFile.configurationTemplateFileName
    );

    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const configModule = await generateBicepFromFile(configWebappTemplateFilePath, pluginCtx);

    const result: ArmTemplateResult = {
      Reference: WebappBicep.Reference,
      Configuration: {
        Modules: { webapp: configModule },
      },
    };

    return ok(result);
  }

  public async localDebug(ctx: PluginContext): Promise<TeamsFxResult> {
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    return ok(undefined);
  }

  public async preDeploy(ctx: PluginContext): Promise<TeamsFxResult> {
    return ok(undefined);
  }

  public async executeUserTask(func: Func, ctx: PluginContext): Promise<TeamsFxResult> {
    return ok(undefined);
  }

  public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartDeploy(PluginInfo.displayName));

    this.syncConfigFromContext(ctx);

    const webAppName = this.checkAndGet(this.config.webAppName, ConfigKey.webAppName);
    const resourceGroupName = this.checkAndGet(
      this.config.resourceGroupName,
      ConfigKey.resourceGroupName
    );
    const subscriptionId = this.checkAndGet(this.config.subscriptionId, ConfigKey.subscriptionId);
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getAccountCredentialAsync(),
      ConfigKey.credential
    );

    const projectFilePath = path.resolve(
      ctx.root,
      this.checkAndGet(this.config.projectFilePath, ConfigKey.projectFilePath)
    );

    await runWithErrorCatchAndThrow(
      new ProjectPathError(projectFilePath),
      async () => await fs.pathExists(projectFilePath)
    );
    const projectPath = path.dirname(projectFilePath);

    const framework = await Deploy.getFrameworkVersion(projectFilePath);
    const runtime = PluginInfo.defaultRuntime;

    const client = AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId);

    await Deploy.build(projectPath, runtime);

    const folderToBeZipped = PathInfo.publishFolderPath(projectPath, framework, runtime);
    await Deploy.zipDeploy(client, resourceGroupName, webAppName, folderToBeZipped);

    Logger.info(Messages.EndDeploy(PluginInfo.displayName));
    return ok(undefined);
  }
}
