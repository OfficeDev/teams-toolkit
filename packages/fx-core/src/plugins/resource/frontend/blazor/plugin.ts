// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  PluginContext,
  AzureSolutionSettings,
  ok,
  ReadonlyPluginConfig,
} from "@microsoft/teamsfx-api";
import {
  AzureInfo,
  BlazorPluginInfo as PluginInfo,
  BlazorConfigInfo as ConfigInfo,
  DependentPluginInfo,
  BlazorPathInfo as PathInfo,
} from "./constants";
import { Messages } from "./resources/messages";
import { TeamsFxResult } from "./error-factory";
import { WebSiteManagementModels } from "@azure/arm-appservice";
import { v4 as uuid } from "uuid";
import * as Provision from "./ops/provision";
import { AzureClientFactory } from "./utils/azure-client";
import { NameValuePair } from "@azure/arm-appservice/esm/models";
import { BlazorConfigKey as ConfigKey, AppSettingsKey } from "./enum";
import {
  ConfigureWebAppError,
  FetchConfigError,
  ProjectPathError,
  runWithErrorCatchAndWrap,
  runWithErrorCatchAndThrow,
} from "./resources/errors";
import * as Deploy from "./ops/deploy";
import { Logger } from "../utils/logger";
import path from "path";
import * as fs from "fs-extra";

type Site = WebSiteManagementModels.Site;

export interface BlazorPluginConfig {
  /* Config from solution */
  resourceGroupName?: string;
  subscriptionId?: string;
  resourceNameSuffix?: string;
  location?: string;

  /* Config exported by Blazor plugin */
  webAppName?: string;
  appServicePlanName?: string;
  endpoint?: string;
  domain?: string;
  projectFilePath?: string;

  /* Intermediate  */
  site?: Site;
}

export class BlazorPluginImpl {
  config: BlazorPluginConfig = {};

  private syncConfigFromContext(ctx: PluginContext): void {
    const solutionConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.solutionPluginName
    );
    this.config.resourceGroupName = solutionConfig?.get(
      DependentPluginInfo.resourceGroupName
    ) as string;
    this.config.subscriptionId = solutionConfig?.get(DependentPluginInfo.subscriptionId) as string;
    this.config.resourceNameSuffix = solutionConfig?.get(
      DependentPluginInfo.resourceNameSuffix
    ) as string;
    this.config.location = solutionConfig?.get(DependentPluginInfo.location) as string;

    this.config.webAppName = ctx.config.get(ConfigInfo.webAppName) as string;
    this.config.appServicePlanName = ctx.config.get(ConfigInfo.appServicePlanName) as string;
    this.config.projectFilePath = ctx.config.get(ConfigInfo.projectFilePath) as string;
  }

  private syncConfigToContext(ctx: PluginContext): void {
    Object.entries(this.config)
      .filter((kv) => PluginInfo.persistentConfig.find((x: string) => x === kv[0] && kv[1]))
      .forEach((kv) => ctx.config.set(kv[0], kv[1]));
  }

  private checkAndGet<T>(v: T | undefined, key: string) {
    if (v) {
      return v;
    }
    throw new FetchConfigError(key);
  }

  private isPluginEnabled(ctx: PluginContext, plugin: string): boolean {
    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    return selectedPlugins.includes(plugin);
  }

  public async preProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    this.syncConfigFromContext(ctx);
    const teamsAppName = this.checkAndGet(ctx.projectSettings?.appName, ConfigKey.teamsAppName);
    const suffix: string = this.config.resourceNameSuffix ?? uuid().substr(0, 6);

    this.config.webAppName ??= Provision.generateWebAppName(teamsAppName, PluginInfo.alias, suffix);
    this.config.appServicePlanName ??= this.config.webAppName;

    this.syncConfigToContext(ctx);
    return ok(undefined);
  }

  public async provision(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartProvision(PluginInfo.displayName));
    // TODO: const progressHandler = await ProgressHelper.startProvisionProgressHandler(ctx);

    const resourceGroupName = this.checkAndGet(
      this.config.resourceGroupName,
      ConfigKey.resourceGroupName
    );
    const subscriptionId = this.checkAndGet(this.config.subscriptionId, ConfigKey.subscriptionId);
    const location = this.checkAndGet(this.config.location, ConfigKey.location);
    const appServicePlanName = this.checkAndGet(
      this.config.appServicePlanName,
      ConfigKey.appServicePlanName
    );
    const webAppName = this.checkAndGet(this.config.webAppName, ConfigKey.webAppName);
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getAccountCredentialAsync(),
      ConfigKey.credential
    );

    const client = AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId);

    const appServicePlanId = await Provision.ensureAppServicePlan(
      client,
      resourceGroupName,
      appServicePlanName,
      location
    );
    const site = await Provision.ensureWebApp(
      client,
      resourceGroupName,
      location,
      webAppName,
      appServicePlanId
    );

    this.config.site = site;
    if (!this.config.endpoint) {
      this.config.endpoint = `https://${site.defaultHostName}`;
      this.config.domain = site.defaultHostName;
    }

    this.syncConfigToContext(ctx);

    // TODO: await ProgressHelper.endProvisionProgress(true);
    Logger.info(Messages.EndProvision(PluginInfo.displayName));
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    const resourceGroupName = this.checkAndGet(
      this.config.resourceGroupName,
      ConfigKey.resourceGroupName
    );
    const subscriptionId = this.checkAndGet(this.config.subscriptionId, ConfigKey.subscriptionId);
    const webAppName = this.checkAndGet(this.config.webAppName, ConfigKey.webAppName);
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getAccountCredentialAsync(),
      ConfigKey.credential
    );

    const site = this.checkAndGet(this.config.site, ConfigKey.site);
    this.config.site = undefined;

    const client = AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId);
    const res = await runWithErrorCatchAndWrap(
      (error) => new ConfigureWebAppError(error.code),
      async () => await client.webApps.listApplicationSettings(resourceGroupName, webAppName)
    );
    if (res.properties) {
      Object.entries(res.properties).forEach((kv: [string, string]) => {
        this.pushAppSettings(site, kv[0], kv[1]);
      });
    }

    this.collectAppSettings(ctx, site);
    await runWithErrorCatchAndWrap(
      (error) => new ConfigureWebAppError(error.code),
      async () => await client.webApps.update(resourceGroupName, webAppName, site)
    );

    return ok(undefined);
  }

  public collectAppSettings(ctx: PluginContext, site: Site) {
    this.collectAppSettingsSelf(site);

    const aadConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.aadPluginName
    );
    if (this.isPluginEnabled(ctx, DependentPluginInfo.aadPluginName) && aadConfig) {
      this.collectAppSettingsFromAAD(site, aadConfig);
    }

    const botConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.botPluginName
    );
    if (this.isPluginEnabled(ctx, DependentPluginInfo.botPluginName) && botConfig) {
      this.collectAppSettingsFromBot(site, botConfig);
    }
  }

  public collectAppSettingsSelf(site: Site) {
    const endpoint = this.checkAndGet(this.config.endpoint, ConfigKey.webAppEndpoint);
    this.pushAppSettings(site, AppSettingsKey.tabAppEndpoint, endpoint);
  }

  public collectAppSettingsFromBot(site: Site, botConfig: ReadonlyPluginConfig) {
    const botId = this.checkAndGet(
      botConfig.get(DependentPluginInfo.botId) as string,
      DependentPluginInfo.botId
    );
    const botPassword = this.checkAndGet(
      botConfig.get(DependentPluginInfo.botPassword) as string,
      DependentPluginInfo.botPassword
    );

    this.pushAppSettings(site, AppSettingsKey.botId, botId);
    this.pushAppSettings(site, AppSettingsKey.botPassword, botPassword);
  }

  public collectAppSettingsFromAAD(site: Site, aadConfig: ReadonlyPluginConfig) {
    const clientId: string = this.checkAndGet(
      aadConfig.get(DependentPluginInfo.clientID) as string,
      DependentPluginInfo.clientID
    );
    const clientSecret: string = this.checkAndGet(
      aadConfig.get(DependentPluginInfo.aadClientSecret) as string,
      DependentPluginInfo.aadClientSecret
    );
    const oauthHost: string = this.checkAndGet(
      aadConfig.get(DependentPluginInfo.oauthHost) as string,
      DependentPluginInfo.oauthHost
    );
    const tenantId: string = this.checkAndGet(
      aadConfig.get(DependentPluginInfo.tenantId) as string,
      DependentPluginInfo.tenantId
    );
    const applicationIdUris: string = this.checkAndGet(
      aadConfig.get(DependentPluginInfo.applicationIdUris) as string,
      DependentPluginInfo.applicationIdUris
    );

    this.pushAppSettings(site, AppSettingsKey.clientId, clientId);
    this.pushAppSettings(site, AppSettingsKey.clientSecret, clientSecret);
    this.pushAppSettings(site, AppSettingsKey.oauthHost, `${oauthHost}/${tenantId}`);
    this.pushAppSettings(site, AppSettingsKey.identifierUri, applicationIdUris);
    this.pushAppSettings(
      site,
      AppSettingsKey.aadMetadataAddress,
      AzureInfo.aadMetadataAddress(tenantId)
    );
  }

  public pushAppSettings(site: Site, newName: string, newValue: string, replace = true): void {
    if (!site.siteConfig) {
      site.siteConfig = {};
    }

    if (!site.siteConfig.appSettings) {
      site.siteConfig.appSettings = [];
    }

    const kv: NameValuePair | undefined = site.siteConfig.appSettings.find(
      (kv) => kv.name === newName
    );
    if (!kv) {
      site.siteConfig.appSettings.push({
        name: newName,
        value: newValue,
      });
    } else if (replace) {
      kv.value = newValue;
    }
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
