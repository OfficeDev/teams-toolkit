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
import { isArmSupportEnabled } from "../../..";
import { getArmOutput } from "../utils4v2";

export class FrontendConfig {
  subscriptionId: string;
  resourceGroupName: string;
  location: string;
  storageName: string;
  credentials: TokenCredentialsBase;

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

    const appName = ctx.projectSettings!.appName;
    const solutionConfigs = ctx.envInfo.profile.get(DependentPluginInfo.SolutionPluginName);

    const subscriptionId = FrontendConfig.getConfig<string>(
      DependentPluginInfo.SubscriptionId,
      solutionConfigs
    );
    const resourceNameSuffix = FrontendConfig.getConfig<string>(
      DependentPluginInfo.ResourceNameSuffix,
      solutionConfigs
    );
    const resourceGroupName = FrontendConfig.getConfig<string>(
      DependentPluginInfo.ResourceGroupName,
      solutionConfigs
    );
    const location = FrontendConfig.getConfig<string>(
      DependentPluginInfo.Location,
      solutionConfigs
    );

    let storageName: string | undefined;
    if (isArmSupportEnabled()) {
      storageName = getArmOutput(ctx, ArmOutput.FrontendStorageName) as string;
      if (!storageName) {
        storageName = ctx.config.getString(FrontendConfigInfo.StorageName);
      }
    } else {
      storageName = ctx.config.getString(FrontendConfigInfo.StorageName);
    }
    if (!storageName) {
      storageName = Utils.generateStorageAccountName(
        appName,
        resourceNameSuffix,
        Constants.FrontendSuffix
      );
    }

    if (!RegularExpr.FrontendStorageNamePattern.test(storageName)) {
      throw new InvalidStorageNameError();
    }

    return new FrontendConfig(
      subscriptionId,
      resourceGroupName,
      location,
      storageName,
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
