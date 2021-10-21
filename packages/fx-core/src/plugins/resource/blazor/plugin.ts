// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import {
  PluginContext,
  AzureSolutionSettings,
  ok,
  ReadonlyPluginConfig,
} from "@microsoft/teamsfx-api";
import {
  AppSettingsKey,
  AzureInfo,
  BlazorPluginInfo as PluginInfo,
  DefaultProvisionConfigs,
  DependentPluginInfo,
} from "./constants";
import { Logger } from "./utils/logger";
import { Messages } from "./resources/messages";
import { TeamsFxResult } from "./error-factory";
import { ProgressHelper } from "./utils/progress-helper";
import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";
import { v4 as uuid } from "uuid";
import { BlazorNaming, BlazorProvision } from "./ops/provision";
import { AzureClientFactory, AzureLib } from "./utils/azure-client";
import { NameValuePair } from "@azure/arm-appservice/esm/models";
import { execute } from "./utils/execute";
import { forEachFileAndDir } from "./utils/dir-walk";
import { sendRequestWithRetry } from "../../../common/templatesUtils";
import axios from "axios";

type Site = WebSiteManagementModels.Site;
type AppServicePlan = WebSiteManagementModels.AppServicePlan;
type SiteAuthSettings = WebSiteManagementModels.SiteAuthSettings;

export interface WebAppConfig {
  /* Config from solution */
  resourceGroupName?: string;
  subscriptionId?: string;
  resourceNameSuffix?: string;
  location?: string;

  /* Config exported by Blazor plugin */
  webAppName?: string;
  appServicePlanName?: string;
  webAppEndpoint?: string;
  webAppId?: string;

  /* Intermediate  */
  site?: Site;
}

export class BlazorPluginImpl {
  config: WebAppConfig = {};

  private syncConfigFromContext(ctx: PluginContext): void {
    const solutionConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get("solution");
    this.config.resourceNameSuffix = solutionConfig?.get("resourceNameSuffix") as string;
    this.config.resourceGroupName = solutionConfig?.get("resourceGroupName") as string;
    this.config.subscriptionId = solutionConfig?.get("subscriptionId") as string;
    this.config.location = solutionConfig?.get("location") as string;

    this.config.webAppName = ctx.config.get("webAppName") as string;
    this.config.appServicePlanName = ctx.config.get("appServicePlanName") as string;
  }

  private syncConfigToContext(ctx: PluginContext): void {
    Object.entries(this.config)
      .filter((kv) => PluginInfo.PersistentConfig.find((x: string) => x === kv[0]))
      .forEach((kv) => {
        if (kv[1]) {
          ctx.config.set(kv[0], kv[1]);
        }
      });
  }

  private checkAndGet<T>(v: T | undefined, key: string) {
    if (v) {
      return v;
    }
    throw new Error(`No value: ${key}`);
  }

  private isPluginEnabled(ctx: PluginContext, plugin: string): boolean {
    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    return selectedPlugins.includes(plugin);
  }

  public async preProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    this.syncConfigFromContext(ctx);
    const teamsAppName: string = ctx.projectSettings?.appName ?? "MyTeamsApp";
    const suffix: string = this.config.resourceNameSuffix ?? uuid().substr(0, 6);

    this.config.webAppName ??= BlazorNaming.generateWebAppName(teamsAppName, suffix, "bz");
    this.config.appServicePlanName ??= this.config.webAppName;

    this.syncConfigToContext(ctx);
    return ok(undefined);
  }

  public async provision(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartProvision(PluginInfo.DisplayName));
    const progressHandler = await ProgressHelper.startProvisionProgressHandler(ctx);

    const resourceGroupName = this.checkAndGet(this.config.resourceGroupName, "resourceGroupName");
    const subscriptionId = this.checkAndGet(this.config.subscriptionId, "subscriptionId");
    const location = this.checkAndGet(this.config.location, "location");
    const appServicePlanName = this.checkAndGet(
      this.config.appServicePlanName,
      "appServicePlanName"
    );
    const webAppName = this.checkAndGet(this.config.webAppName, "webAppName");
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getAccountCredentialAsync(),
      "credential"
    );

    const client = AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId);
    const appServicePlan = await AzureLib.ensureAppServicePlans(
      client,
      resourceGroupName,
      appServicePlanName,
      DefaultProvisionConfigs.appServicePlansConfig(location)
    );
    const appServicePlanId: string | undefined = appServicePlan.id;
    if (!appServicePlanId) {
      throw new Error("app service plan id");
    }

    const site = await BlazorProvision.ensureWebApp(
      client,
      resourceGroupName,
      location,
      webAppName,
      appServicePlanId
    );

    this.config.site = site;
    if (!this.config.webAppEndpoint) {
      this.config.webAppEndpoint = `https://${site.defaultHostName}`;
    }

    this.syncConfigToContext(ctx);

    await ProgressHelper.endProvisionProgress(true);
    Logger.info(Messages.EndProvision(PluginInfo.DisplayName));
    return ok(undefined);
  }

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
    const webAppName = this.checkAndGet(this.config.webAppName, "webAppName");
    const resourceGroupName = this.checkAndGet(this.config.resourceGroupName, "resourceGroupName");
    const subscriptionId = this.checkAndGet(this.config.subscriptionId, "subscription");
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getAccountCredentialAsync(),
      "credential"
    );
    const endpoint = this.checkAndGet(this.config.webAppEndpoint, "endpoint");

    const site = this.checkAndGet(this.config.site, "site");
    this.config.site = undefined;

    const client = AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId);
    const res = await client.webApps.listApplicationSettings(resourceGroupName, webAppName);
    if (res.properties) {
      Object.entries(res.properties).forEach((kv: [string, string]) => {
        this.pushAppSettings(site, kv[0], kv[1]);
      });
    }

    const aadConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.AADPluginName
    );
    if (this.isPluginEnabled(ctx, DependentPluginInfo.AADPluginName) && aadConfig) {
      const clientId: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.ClientID) as string,
        "AAD client Id"
      );
      const clientSecret: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.aadClientSecret) as string,
        "AAD secret"
      );
      const oauthHost: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.oauthHost) as string,
        "OAuth Host"
      );
      const tenantId: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.tenantId) as string,
        "Tenant Id"
      );
      const applicationIdUris: string = this.checkAndGet(
        aadConfig.get(DependentPluginInfo.applicationIdUris) as string,
        "Application Id URI"
      );

      this.pushAppSettings(site, AppSettingsKey.clientId, clientId);
      this.pushAppSettings(site, AppSettingsKey.clientSecret, clientSecret);
      this.pushAppSettings(site, AppSettingsKey.oauthHost, `${oauthHost}/${tenantId}`);
      this.pushAppSettings(site, AppSettingsKey.identifierUri, applicationIdUris);
      this.pushAppSettings(
        site,
        AppSettingsKey.aadMetadataAddress,
        `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`
      );
    }

    const botConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.state.get(
      DependentPluginInfo.BotPluginName
    );
    if (this.isPluginEnabled(ctx, DependentPluginInfo.BotPluginName) && botConfig) {
      const botId = this.checkAndGet(botConfig.get(DependentPluginInfo.botId) as string, "bot id");
      const botPassword = this.checkAndGet(
        botConfig.get(DependentPluginInfo.botPassword) as string,
        "bot password"
      );

      this.pushAppSettings(site, AppSettingsKey.botId, botId);
      this.pushAppSettings(site, AppSettingsKey.botPassword, botPassword);
    }

    this.pushAppSettings(site, AppSettingsKey.tabAppEndpoint, endpoint);
    await client.webApps.update(resourceGroupName, webAppName, site);
    return ok(undefined);
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
    Logger.info(Messages.StartDeploy(PluginInfo.DisplayName));
    await ProgressHelper.startDeployProgressHandler(ctx);

    this.syncConfigFromContext(ctx);

    const workingPath = ctx.root;
    const webAppName = this.checkAndGet(this.config.webAppName, "web app name");
    const resourceGroupName = this.checkAndGet(
      this.config.resourceGroupName,
      "resource group name"
    );
    const subscriptionId = this.checkAndGet(this.config.subscriptionId, "subscription id");
    const credential = this.checkAndGet(
      await ctx.azureAccountProvider?.getAccountCredentialAsync(),
      "credential"
    );

    const runtime = "win-x86";
    const framework = "net5.0";

    const client = AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId);

    await this.build(workingPath, runtime);

    const folderToBeZipped = path.join(
      workingPath,
      "bin",
      "Release",
      framework,
      runtime,
      "publish"
    );
    this.zipDeploy(client, resourceGroupName, webAppName, folderToBeZipped);

    await ProgressHelper.endDeployProgress(true);
    Logger.info(Messages.EndDeploy(PluginInfo.DisplayName));
    return ok(undefined);
  }

  private async build(path: string, runtime: string) {
    const command = `dotnet publish --configuration Release --runtime ${runtime} --self-contained`;
    await execute(command, path);
  }

  private async zipDeploy(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    webAppName: string,
    componentPath: string
  ) {
    const zip = await this.generateZip(componentPath);
    const zipContent = zip.toBuffer();

    const publishCred = await client.webApps.listPublishingCredentials(
      resourceGroupName,
      webAppName
    );
    const username = publishCred.publishingUserName;
    const password = publishCred.publishingPassword;

    if (!password) {
      throw new Error(password);
    }

    await sendRequestWithRetry(
      async () =>
        await axios.post(AzureInfo.zipDeployURL(webAppName), zipContent, {
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "no-cache",
          },
          auth: {
            username: username,
            password: password,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 10 * 60 * 1000,
        }),
      3
    );
  }

  private async generateZip(componentPath: string) {
    const zip = new AdmZip();
    const tasks: Promise<void>[] = [];
    const zipFiles = new Set<string>();

    const addFileIntoZip = async (zip: AdmZip, filePath: string, zipPath: string) => {
      const content = await fs.readFile(filePath);
      zip.addFile(zipPath, content);
    };

    await forEachFileAndDir(componentPath, (itemPath: string, stats: fs.Stats) => {
      const relativePath: string = path.relative(componentPath, itemPath);
      if (relativePath && !stats.isDirectory()) {
        zipFiles.add(relativePath);

        // If fail to reuse cached entry, load it from disk.
        const fullPath = path.join(componentPath, relativePath);
        const task = addFileIntoZip(zip, fullPath, relativePath);
        tasks.push(task);
      }
    });

    await Promise.all(tasks);
    return zip;
  }
}
