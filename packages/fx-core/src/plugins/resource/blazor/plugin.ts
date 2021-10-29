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
  AzureInfo,
  BlazorPluginInfo as PluginInfo,
  BlazorConfigInfo as ConfigInfo,
  DefaultProvisionConfigs,
  DependentPluginInfo,
  BlazorPathInfo as PathInfo,
  BlazorCommands as Commands,
} from "./constants";
import { Logger } from "./utils/logger";
import { Messages } from "./resources/messages";
import { TeamsFxResult } from "./error-factory";
import { ProgressHelper } from "./utils/progress-helper";
import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";
import { v4 as uuid } from "uuid";
import { BlazorNaming as Naming, BlazorProvision as Provision } from "./ops/provision";
import { AzureClientFactory, AzureLib } from "./utils/azure-client";
import { NameValuePair } from "@azure/arm-appservice/esm/models";
import { execute } from "./utils/execute";
import { forEachFileAndDir } from "./utils/dir-walk";
import { sendRequestWithRetry } from "../../../common/templatesUtils";
import axios from "axios";
import { BlazorConfigKey as ConfigKey, AppSettingsKey, ResourceType } from "./enum";
import {
  ConfigureWebAppError,
  FetchConfigError,
  ProvisionError,
  BuildError,
  runWithErrorCatchAndThrow,
  runWithErrorCatchAndWrap,
  ZipError,
  PublishCredentialError,
  UploadZipError,
} from "./resources/errors";

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
  webAppEndpoint?: string;
  webAppId?: string;

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
  }

  private syncConfigToContext(ctx: PluginContext): void {
    Object.entries(this.config)
      .filter((kv) => PluginInfo.persistentConfig.find((x: string) => x === kv[0]))
      // TODO: .filter((kv) => PluginInfo.persistentConfig.find((x: string) => x === kv[0] && kv[1]))
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
    throw new FetchConfigError(key);
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

    this.config.webAppName ??= Naming.generateWebAppName(teamsAppName, PluginInfo.alias, suffix);
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

    const appServicePlan = await runWithErrorCatchAndWrap(
      (error) => new ProvisionError(ResourceType.appServicePlan, error.code),
      async () =>
        await AzureLib.ensureAppServicePlans(
          client,
          resourceGroupName,
          appServicePlanName,
          DefaultProvisionConfigs.appServicePlansConfig(location)
        )
    );
    const appServicePlanId: string | undefined = appServicePlan.id;
    if (!appServicePlanId) {
      // TODO: Logger.error("failToGetAppServicePlanId");
      throw new ProvisionError(ResourceType.appServicePlan);
    }

    const site = await runWithErrorCatchAndWrap(
      (error) => new ProvisionError(ResourceType.webApp, error.code),
      async () =>
        await Provision.ensureWebApp(
          client,
          resourceGroupName,
          location,
          webAppName,
          appServicePlanId
        )
    );

    if (!site.defaultHostName) {
      // TODO: Logger.error("failToGetWebAppEndpoint");
      throw new ProvisionError(ResourceType.webApp);
    }

    this.config.site = site;
    if (!this.config.webAppEndpoint) {
      this.config.webAppEndpoint = `https://${site.defaultHostName}`;
    }

    this.syncConfigToContext(ctx);

    await ProgressHelper.endProvisionProgress(true);
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
    const endpoint = this.checkAndGet(this.config.webAppEndpoint, ConfigKey.webAppEndpoint);
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
    await ProgressHelper.startDeployProgressHandler(ctx);

    this.syncConfigFromContext(ctx);

    const workingPath = ctx.root;
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

    // ? Do we support user customize framework and runtime? If yes, how?
    // * If we support user customize runtime, we need to validate its value because we use it to concat build command.
    const framework = PluginInfo.defaultFramework;
    const runtime = PluginInfo.defaultRuntime;

    const client = AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId);

    await runWithErrorCatchAndWrap(
      (error) => new BuildError(error),
      async () => await this.build(workingPath, runtime)
    );

    const folderToBeZipped = PathInfo.publishFolderPath(workingPath, framework, runtime);
    await this.zipDeploy(client, resourceGroupName, webAppName, folderToBeZipped);

    await ProgressHelper.endDeployProgress(true);
    Logger.info(Messages.EndDeploy(PluginInfo.displayName));
    return ok(undefined);
  }

  private async build(path: string, runtime: string) {
    const command = Commands.buildRelease(runtime);
    await execute(command, path);
  }

  private async zipDeploy(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    webAppName: string,
    componentPath: string
  ) {
    const zip = await runWithErrorCatchAndThrow(
      new ZipError(),
      async () => await this.generateZip(componentPath)
    );
    const zipContent = zip.toBuffer();

    const publishCred = await runWithErrorCatchAndThrow(
      new PublishCredentialError(),
      async () => await client.webApps.listPublishingCredentials(resourceGroupName, webAppName)
    );
    const username = publishCred.publishingUserName;
    const password = publishCred.publishingPassword;

    if (!password) {
      // TODO: Logger.error("Filaed to query publish cred.");
      throw new PublishCredentialError();
    }

    await runWithErrorCatchAndThrow(
      new UploadZipError(),
      async () =>
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
        )
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
