// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as dotenv from "dotenv";
dotenv.config();

export class Env {
  public static get username() {
    return this.getVal("M365_ACCOUNT_NAME", process.env.M365_ACCOUNT_NAME);
  }

  static get password() {
    return this.getVal(
      "M365_ACCOUNT_PASSWORD",
      process.env.M365_ACCOUNT_PASSWORD
    );
  }

  static get displayName() {
    return this.getVal("M365_DISPLAY_NAME", process.env.M365_DISPLAY_NAME);
  }

  static get azureDisplayName() {
    return this.getVal("AZURE_DISPLAY_NAME", process.env.AZURE_DISPLAY_NAME);
  }

  static get cleanTenantId() {
    return this.getVal("CLEAN_TENANT_ID", process.env.CLEAN_TENANT_ID);
  }

  static get cleanClientId() {
    return this.getVal("CLEAN_CLIENT_ID", process.env.CLEAN_CLIENT_ID);
  }

  static get azureAccountName() {
    return this.getVal("AZURE_ACCOUNT_NAME", process.env.AZURE_ACCOUNT_NAME);
  }

  static get azureAccountPassword() {
    return this.getVal(
      "AZURE_ACCOUNT_PASSWORD",
      process.env.AZURE_ACCOUNT_PASSWORD
    );
  }

  static get azureSubscriptionId() {
    return this.getVal(
      "AZURE_SUBSCRIPTION_ID",
      process.env.AZURE_SUBSCRIPTION_ID
    );
  }

  static get azureSubscriptionName() {
    return this.getVal(
      "AZURE_SUBSCRIPTION_NAME",
      process.env.AZURE_SUBSCRIPTION_NAME
    );
  }

  static get azureTenantId() {
    return this.getVal("AZURE_TENANT_ID", process.env.AZURE_TENANT_ID);
  }

  static get collaborator() {
    return this.getVal("M365_COLLABORATOR", process.env.M365_COLLABORATOR);
  }

  static get ngrokToken() {
    return this.getVal("NGROK_TOKEN", process.env.NGROK_TOKEN);
  }

  static get TARGET_CLI() {
    return this.getVal("TARGET_CLI_VERSION", process.env.TARGET_CLI_VERSION);
  }

  static get AZURE_CLIENT_ID() {
    return this.getVal("AZURE_CLIENT_ID", process.env.AZURE_CLIENT_ID);
  }

  static get AZURE_CLIENT_SECRET() {
    return this.getVal("AZURE_CLIENT_SECRET", process.env.AZURE_CLIENT_SECRET);
  }

  static get azureResourceGroup() {
    return this.getVal(
      "AZURE_RESOURCE_GROUP_NAME",
      process.env.AZURE_RESOURCE_GROUP_NAME
    );
  }

  private static getVal(name: string, value: string | undefined): string {
    if (!value) {
      throw new Error(`Environment variable ${name} should not be empty.`);
    }
    return value as string;
  }
}

export class FeatureFlags {
  static addMultiEnv() {
    FeatureFlags.addFeatureFlag("TEAMSFX_MULTI_ENV");
  }

  static addRemoteCollaborate() {
    FeatureFlags.addFeatureFlag("TEAMSFX_REMOTE_COL");
  }

  static addArmSupport() {
    FeatureFlags.addFeatureFlag("TEAMSFX_ARM_SUPPORT");
  }

  static addBicepEnvCheck() {
    FeatureFlags.addFeatureFlag("TEAMSFX_BICEP_ENV_CHECKER_ENABLE");
  }

  static removeMultiEnv() {
    FeatureFlags.removeFeatureFlag("TEAMSFX_MULTI_ENV");
  }

  static removeRemoteCollaborate() {
    FeatureFlags.removeFeatureFlag("TEAMSFX_REMOTE_COL");
  }

  static removeArmSupport() {
    FeatureFlags.removeFeatureFlag("TEAMSFX_ARM_SUPPORT");
  }

  static removeBicepEnvCheck() {
    FeatureFlags.removeFeatureFlag("TEAMSFX_BICEP_ENV_CHECKER_ENABLE");
  }

  private static addFeatureFlag(name: string): void {
    process.env[name] = "true";
  }

  private static removeFeatureFlag(name: string): void {
    process.env[name] = "false";
  }
}
