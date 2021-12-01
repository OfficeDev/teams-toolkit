// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class Constants {
  static readonly provisionModuleTemplateFileName: string = "keyVaultProvision.template.bicep";
  static readonly configModuleTemplateFileName: string = "keyVaultConfiguration.template.bicep";

  static readonly SolutionPlugin = {
    id: "solution",
    configKeys: {
      remoteTeamsAppId: "remoteTeamsAppId",
    },
  };

  static readonly KeyVaultPlugin = {
    pluginName: "fx-resource-key-vault",
    displayName: "Key Vault Plugin",
    shortName: "kv",
  };

  static readonly KeyVaultBicep = {
    m365ClientSecretReference: "provisionOutputs.keyVaultOutput.value.m365ClientSecretReference",
    botClientSecretReference: "provisionOutputs.keyVaultOutput.value.botClientSecretReference",
  };

  static readonly Stage = {
    generateArmTemplates: "generate-arm-templates",
  };
}

export class Telemetry {
  static component = "component";
  static errorCode = "error-code";
  static errorType = "error-type";
  static errorMessage = "error-message";
  static userError = "user";
  static systemError = "system";
  static isSuccess = "success";
  static success = "yes";
  static fail = "no";
  static appId = "appid";
}
