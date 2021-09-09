// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, ReadonlyPluginConfig } from "@microsoft/teamsfx-api";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

import {
  ArmOutput,
  Constants,
  DependentPluginInfo,
  FrontendConfigInfo,
  RegularExpr,
} from "./constants";
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
  isArmSupportEnabled,
} from "../../..";
import { getArmOutput } from "../utils4v2";

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

  static async fromPluginContext(
    ctx: PluginContext,
    getFromArmOutput = false
  ): Promise<FrontendConfig> {
    const credentials = await ctx.azureAccountProvider?.getAccountCredentialAsync();
    if (!credentials) {
      throw new UnauthenticatedError();
    }

    return new FrontendConfig(
      FrontendConfig.getSubscriptionId(ctx, getFromArmOutput),
      FrontendConfig.getResourceGroupName(ctx, getFromArmOutput),
      FrontendConfig.getConfig<string>(
        DependentPluginInfo.Location,
        ctx.envInfo.profile.get(DependentPluginInfo.SolutionPluginName)
      ),
      FrontendConfig.getStorageName(ctx, getFromArmOutput),
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

  static getStorageName(ctx: PluginContext, getFromArmOutput = false): string {
    let result = isArmSupportEnabled()
      ? getStorageAccountNameFromResourceId(
          FrontendConfig.getStorageResourceId(ctx, getFromArmOutput)
        )
      : ctx.config.getString(FrontendConfigInfo.StorageName);
    if (!result) {
      const resourceNameSuffix = FrontendConfig.getConfig<string>(
        DependentPluginInfo.ResourceNameSuffix,
        ctx.envInfo.profile.get(DependentPluginInfo.SolutionPluginName)
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

  static getStorageResourceId(ctx: PluginContext, getFromArmOutput = false): string {
    const result = getFromArmOutput
      ? getArmOutput(ctx, ArmOutput.FrontendStorageResourceId)
      : ctx.config.getString(FrontendConfigInfo.StorageResourceId);
    if (!result) {
      throw new InvalidConfigError("storage accounts resource id");
    }
    return result;
  }

  static getSubscriptionId(ctx: PluginContext, getFromArmOutput = false): string {
    const result = isArmSupportEnabled()
      ? getSubscriptionIdFromResourceId(FrontendConfig.getStorageResourceId(ctx, getFromArmOutput))
      : FrontendConfig.getConfig<string>(
          DependentPluginInfo.SubscriptionId,
          ctx.envInfo.profile.get(DependentPluginInfo.SolutionPluginName)
        );
    if (!result) {
      throw new InvalidConfigError("subscription id");
    }
    return result;
  }

  static getResourceGroupName(ctx: PluginContext, getFromArmOutput = false): string {
    const result = isArmSupportEnabled()
      ? getResourceGroupNameFromResourceId(
          FrontendConfig.getStorageResourceId(ctx, getFromArmOutput)
        )
      : FrontendConfig.getConfig<string>(
          DependentPluginInfo.ResourceGroupName,
          ctx.envInfo.profile.get(DependentPluginInfo.SolutionPluginName)
        );
    if (!result) {
      throw new InvalidConfigError("resource group name");
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
