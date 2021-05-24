// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { PluginContext, ReadonlyPluginConfig } from "@microsoft/teamsfx-api";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

import { Constants, DependentPluginInfo, FrontendConfigInfo } from "./constants";
import {
  InvalidConfigError,
  InvalidStorageNameError,
  UnauthenticatedError,
} from "./resources/errors";
import { Utils } from "./utils";

export class FrontendConfig {
  subscriptionId: string;
  resourceGroupName: string;
  location: string;
  storageName: string;
  credentials: TokenCredentialsBase;

  localPath?: string;

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

    const appName = ctx.app.name.short;
    const solutionConfigs = ctx.configOfOtherPlugins.get(DependentPluginInfo.SolutionPluginName);

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

    let storageName = ctx.config.getString(FrontendConfigInfo.StorageName);
    if (!storageName) {
      storageName = Utils.generateStorageAccountName(
        appName,
        resourceNameSuffix,
        Constants.FrontendSuffix
      );
    }
    if (!Constants.FrontendStorageNamePattern.test(storageName)) {
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

  private static getConfig<T>(key: string, configs?: ReadonlyPluginConfig): T {
    const value = configs?.get(key) as T;
    if (!value) {
      throw new InvalidConfigError(key);
    }
    return value;
  }
}
