// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class Constants {
  public static readonly pluginName: string = "SQL Plugin";
  public static readonly pluginNameShort: string = "SQL";
  public static readonly pluginFullName: string = "fx-resource-azure-sql";

  public static readonly firewall = {
    azureIp: "0.0.0.0",
    azureRule: "AllowAzure",
    localRule: "AllowLocal",
  };

  public static readonly ipBeginToken = "0";
  public static readonly ipEndToken = "255";

  public static readonly jwtToken = {
    ver1: "1.0",
    ver2: "2.0",
    userType: "0",
  };

  public static readonly sqlAdministratorType: string = "ActiveDirectory";

  public static readonly echoIpAddress: string = "https://api.ipify.org";

  public static readonly azureSqlScope: string = "https://database.windows.net//.default";

  public static readonly resourceGroupName: string = "resourceGroupName";
  public static readonly sqlEndpoint: string = "sqlEndpoint";
  public static readonly sqlResourceId: string = "sqlResourceId";
  public static readonly databaseName: string = "databaseName";
  public static readonly skipAddingUser: string = "skipAddingUser";
  public static readonly admin: string = "admin";
  public static readonly adminPassword: string = "adminPassword";

  public static readonly solution: string = "solution";
  public static readonly solutionPluginFullName = "fx-solution-azure";

  public static readonly solutionConfigKey = {
    subscriptionId: "subscriptionId",
    resourceGroupName: "resourceGroupName",
    resourceNameSuffix: "resourceNameSuffix",
    location: "location",
    tenantId: "tenantId",
    remoteTeamsAppId: "remoteTeamsAppId",
  };

  public static readonly identityPlugin: string = "fx-resource-identity";
  public static readonly identityName: string = "identityName";

  public static readonly userQuestion = {
    adminName: "Admin name of SQL",
    adminPassword: "Admin password of SQL",
    confirmPassword: "Confirm admin password of SQL",
    skipAddingUser: "Skip adding database user",
  };

  public static readonly questionKey = {
    adminName: "sql-admin-name",
    adminPassword: "sql-password",
    confirmPassword: "sql-confirm-password",
    skipAddingUser: "sql-skip-adding-user",
  };

  public static readonly resourceProvider: string = "Microsoft.Sql";
}

export class Telemetry {
  static readonly componentName = "fx-resource-azure-sql";
  static startSuffix = "-start";
  static valueYes = "yes";
  static valueNo = "no";
  static userError = "user";
  static systemError = "system";

  static readonly stage = {
    preProvision: "pre-provision",
    provision: "provision",
    postProvision: "post-provision",
    getQuestion: "get-question",
    generateArmTemplates: "generate-arm-templates",
  };

  static readonly properties = {
    component: "component",
    success: "success",
    errorCode: "error-code",
    errorType: "error-type",
    errorMessage: "error-message",
    appid: "appid",
    skipAddingUser: "skip-adding-user",
  };
}

export class HelpLinks {
  static readonly default = "https://aka.ms/teamsfx-sql-help";
}

export class AzureSqlBicep {
  static readonly sqlEndpoint: string = "azureSqlProvision.outputs.sqlEndpoint";
  static readonly databaseName: string = "azureSqlProvision.outputs.databaseName";
}

export class AzureSqlArmOutput {
  static readonly sqlResourceId: string = "azureSql_sqlResourceId";
  static readonly sqlEndpoint: string = "azureSql_sqlEndpoint";
  static readonly databaseName: string = "azureSql_databaseName";
}

export class AzureSqlBicepFile {
  static readonly moduleTemplateFileName: string = "sql.template.bicep";
}
