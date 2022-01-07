// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, ReadonlyPluginConfig } from "@microsoft/teamsfx-api";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

import { Constants, DependentPluginInfo, FrontendConfigInfo, RegularExpr } from "./constants";
import {
  InvalidConfigError,
  InvalidStorageNameError,
  UnauthenticatedError,
} from "./resources/errors";
import { Utils } from "./utils";
import {
  getResourceGroupNameFromResourceId,
  getStorageAccountNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../..";

export class FrontendConfig {
  subscriptionId: string;
  resourceGroupName: string;
  location: string;
  credentials: TokenCredentialsBase;

  storageName: string;
  storageResourceId?: string;
  endpoint?: string;
  domain?: string;

  private constructor(
    subscriptionId: string,
    resourceGroupName: string,
    location: string,
    storageName: string,
    credentials: TokenCredentialsBase
  ) {
    this.subscriptionId = subscriptionId;
    this.resourceGroupName = resourceGroupName;
    this.location = location;
    this.storageName = storageName;
    this.credentials = credentials;
  }

  static async fromPluginContext(ctx: PluginContext): Promise<FrontendConfig> {
    const credentials = await ctx.azureAccountProvider?.getAccountCredentialAsync();
    if (!credentials) {
      throw new UnauthenticatedError();
    }

    return new FrontendConfig(
      FrontendConfig.getSubscriptionId(ctx),
      FrontendConfig.getResourceGroupName(ctx),
      FrontendConfig.getConfig<string>(
        DependentPluginInfo.Location,
        ctx.envInfo.state.get(DependentPluginInfo.SolutionPluginName)
      ),
      FrontendConfig.getStorageName(ctx),
      credentials
    );
  }

  public syncToPluginContext(ctx: PluginContext): void {
    Object.entries(this)
      .filter((kv) => FrontendConfig.persistentConfigList.includes(kv[0]))
      .forEach((kv) => {
        if (kv[1]) {
          FrontendConfig.setConfigIfNotExists(ctx, kv[0], kv[1]);
        }
      });
  }

  static getStorageName(ctx: PluginContext): string {
    let result;
    try {
      result = getStorageAccountNameFromResourceId(FrontendConfig.getStorageResourceId(ctx));
    } catch (e) {
      throw new InvalidConfigError(FrontendConfigInfo.StorageName, (e as Error).message);
    }
    if (!result) {
      const resourceNameSuffix = FrontendConfig.getConfig<string>(
        DependentPluginInfo.ResourceNameSuffix,
        ctx.envInfo.state.get(DependentPluginInfo.SolutionPluginName)
      );
      result = Utils.generateStorageAccountName(
        ctx.projectSettings!.appName,
        resourceNameSuffix,
        Constants.FrontendSuffix
      );
    }
    if (!RegularExpr.FrontendStorageNamePattern.test(result)) {
      throw new InvalidStorageNameError();
    }
    return result;
  }

  static getStorageResourceId(ctx: PluginContext): string {
    const result = ctx.config.getString(FrontendConfigInfo.StorageResourceId);
    if (!result) {
      throw new InvalidConfigError(FrontendConfigInfo.StorageResourceId);
    }
    return result;
  }

  static getSubscriptionId(ctx: PluginContext): string {
    const result = getSubscriptionIdFromResourceId(FrontendConfig.getStorageResourceId(ctx));
    if (!result) {
      throw new InvalidConfigError(DependentPluginInfo.SubscriptionId);
    }
    return result;
  }

  static getResourceGroupName(ctx: PluginContext): string {
    const result = getResourceGroupNameFromResourceId(FrontendConfig.getStorageResourceId(ctx));
    if (!result) {
      throw new InvalidConfigError(DependentPluginInfo.ResourceGroupName);
    }
    return result;
  }

  private static persistentConfigList = Object.values(FrontendConfigInfo);

  private static getConfig<T>(key: string, configs?: ReadonlyPluginConfig): T {
    const value = configs?.get(key) as T;
    if (!value) {
      throw new InvalidConfigError(key);
    }
    return value;
  }

  private static setConfigIfNotExists(ctx: PluginContext, key: string, value: unknown): void {
    if (ctx.config.get(key)) {
      return;
    }
    ctx.config.set(key, value);
  }
}
