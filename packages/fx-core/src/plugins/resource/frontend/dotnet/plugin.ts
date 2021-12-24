// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, ok, ReadonlyPluginConfig } from "@microsoft/teamsfx-api";
import {
  DotnetPluginInfo as PluginInfo,
  DotnetConfigInfo as ConfigInfo,
  DependentPluginInfo,
  DotnetPathInfo as PathInfo,
} from "./constants";
import { Messages } from "./resources/messages";
import { TeamsFxResult } from "./error-factory";
import { WebSiteManagementModels } from "@azure/arm-appservice";
import { AzureClientFactory } from "./utils/azure-client";
import { DotnetConfigKey as ConfigKey } from "./enum";
import { FetchConfigError, ProjectPathError, runWithErrorCatchAndThrow } from "./resources/errors";
import * as Deploy from "./ops/deploy";
import { Logger } from "../utils/logger";
import path from "path";
import fs from "fs-extra";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../..";

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

export class DotnetPluginImpl {
  config: DotnetPluginConfig = {};

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

  public async postProvision(ctx: PluginContext): Promise<TeamsFxResult> {
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
