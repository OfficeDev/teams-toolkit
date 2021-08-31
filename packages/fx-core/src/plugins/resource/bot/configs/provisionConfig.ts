// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext } from "@microsoft/teamsfx-api";

import * as utils from "../utils/common";
import {
  PluginSolution,
  PluginBot,
  PluginSql,
  PluginIdentity,
  PluginFunction,
  CommonStrings,
} from "../resources/strings";
import { ConfigKeys, WebAppConstants } from "../constants";
import { ConfigValidationError } from "../errors";
import { isArmSupportEnabled } from "../../../../common";

export class ProvisionConfig {
  // Arm support config key
  public validDomain?: string;

  public subscriptionId?: string;
  public resourceGroup?: string;
  public location?: string;
  public appServicePlan?: string;
  public botChannelRegName?: string;
  public siteName?: string;
  public skuName?: string;
  public siteEndpoint?: string;
  public graphToken?: string;
  // Configs from SQL and Function.
  public sqlEndpoint?: string;
  public sqlDatabaseName?: string;
  public identityId?: string;
  public identityName?: string;
  public sqlUserName?: string;
  public sqlPassword?: string;
  public functionEndpoint?: string;

  public async restoreConfigFromContext(context: PluginContext): Promise<void> {
    this.subscriptionId = (
      await context.azureAccountProvider?.getSelectedSubscription()
    )?.subscriptionId;

    this.resourceGroup = context.envInfo.profile
      .get(PluginSolution.PLUGIN_NAME)
      ?.get(PluginSolution.RESOURCE_GROUP_NAME) as string;

    this.location = context.envInfo.profile
      .get(PluginSolution.PLUGIN_NAME)
      ?.get(PluginSolution.LOCATION) as string;

    this.sqlEndpoint = context.envInfo.profile
      .get(PluginSql.PLUGIN_NAME)
      ?.get(PluginSql.SQL_ENDPOINT) as string;

    this.sqlDatabaseName = context.envInfo.profile
      .get(PluginSql.PLUGIN_NAME)
      ?.get(PluginSql.SQL_DATABASE_NAME) as string;

    this.sqlUserName = context.envInfo.profile
      .get(PluginSql.PLUGIN_NAME)
      ?.get(PluginSql.SQL_USERNAME) as string;

    this.sqlPassword = context.envInfo.profile
      .get(PluginSql.PLUGIN_NAME)
      ?.get(PluginSql.SQL_PASSWORD) as string;

    this.identityId = context.envInfo.profile
      .get(PluginIdentity.PLUGIN_NAME)
      ?.get(PluginIdentity.IDENTITY_ID) as string;

    this.identityName = context.envInfo.profile
      .get(PluginIdentity.PLUGIN_NAME)
      ?.get(PluginIdentity.IDENTITY_NAME) as string;

    this.functionEndpoint = context.envInfo.profile
      .get(PluginFunction.PLUGIN_NAME)
      ?.get(PluginFunction.ENDPOINT) as string;

    this.appServicePlan = context.config.get(PluginBot.APP_SERVICE_PLAN) as string;
    this.siteName = context.config.get(PluginBot.SITE_NAME) as string;

    if (!isArmSupportEnabled()) {
      const skuNameValue: ConfigValue = context.config.get(PluginBot.SKU_NAME);
      if (skuNameValue) {
        this.skuName = skuNameValue as string;
      } else {
        this.skuName = WebAppConstants.APP_SERVICE_PLAN_DEFAULT_SKU_NAME;
      }
    }

    this.siteEndpoint = context.config.get(PluginBot.SITE_ENDPOINT) as string;

    this.botChannelRegName = context.config.get(PluginBot.BOT_CHANNEL_REGISTRATION) as string;

    this.validateRestoredConfig();
  }

  public saveConfigIntoContext(context: PluginContext): void {
    utils.checkAndSaveConfig(context, PluginBot.VALID_DOMAIN, this.validDomain);
    utils.checkAndSaveConfig(context, PluginBot.APP_SERVICE_PLAN, this.appServicePlan);
    utils.checkAndSaveConfig(context, PluginBot.BOT_CHANNEL_REGISTRATION, this.botChannelRegName);
    utils.checkAndSaveConfig(context, PluginBot.SITE_NAME, this.siteName);
    utils.checkAndSaveConfig(context, PluginBot.SITE_ENDPOINT, this.siteEndpoint);
    utils.checkAndSaveConfig(context, PluginBot.SKU_NAME, this.skuName);
  }

  private validateRestoredConfig(): void {
    if (this.siteName && !utils.isValidWebAppSiteName(this.siteName)) {
      throw new ConfigValidationError(ConfigKeys.SITE_NAME, this.siteName);
    }

    if (this.siteEndpoint && !utils.isDomainValidForAzureWebApp(this.siteEndpoint)) {
      throw new ConfigValidationError(ConfigKeys.SITE_ENDPOINT, this.siteEndpoint);
    }

    if (this.appServicePlan && !utils.isValidAppServicePlanName(this.appServicePlan)) {
      throw new ConfigValidationError(ConfigKeys.APP_SERVICE_PLAN, this.appServicePlan);
    }

    if (this.botChannelRegName && !utils.isValidBotChannelRegName(this.botChannelRegName)) {
      throw new ConfigValidationError(ConfigKeys.BOT_CHANNEL_REG_NAME, this.botChannelRegName);
    }
  }
}
