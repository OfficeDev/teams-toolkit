// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, ok, ReadonlyPluginConfig } from "@microsoft/teamsfx-api";
import { BlazorPluginInfo as PluginInfo, DefaultProvisionConfigs } from "./constants";
import { Logger } from "./utils/logger";
import { Messages } from "./resources/messages";
import { TeamsFxResult } from "./error-factory";
import { ProgressHelper } from "./utils/progress-helper";
import { WebSiteManagementClient, WebSiteManagementModels } from "@azure/arm-appservice";
import { v4 as uuid } from "uuid";
import { BlazorNaming, BlazorProvision } from "./ops/provision";
import { runWithErrorCatchAndThrow } from "./resources/errors";
import { AzureClientFactory, AzureLib } from "./utils/azure-client";

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
    const solutionConfig: ReadonlyPluginConfig | undefined = ctx.envInfo.profile.get("solution");
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
    return ok(undefined);
  }

  public async deploy(ctx: PluginContext): Promise<TeamsFxResult> {
    Logger.info(Messages.StartDeploy(PluginInfo.DisplayName));
    await ProgressHelper.startDeployProgressHandler(ctx);

    await ProgressHelper.endDeployProgress(true);
    Logger.info(Messages.EndDeploy(PluginInfo.DisplayName));
    return ok(undefined);
  }
}
