// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class Constants {
  static readonly pluginName: string = "SQL Plugin";
  static readonly pluginNameShort: string = "SQL";
  static readonly pluginFullName: string = "fx-resource-azure-sql";

  static readonly firewall = {
    localRule: "AllowLocal",
  };

  static readonly ipBeginToken = "0";
  static readonly ipEndToken = "255";

  static readonly maxRetryTimes = 3;

  static readonly jwtToken = {
    ver1: "1.0",
    ver2: "2.0",
    userType: "0",
  };

  static readonly sqlAdministratorType: string = "ActiveDirectory";

  static readonly echoIpAddress: string = "https://api.ipify.org";

  static readonly azureSqlScope: string = "https://database.windows.net//.default";

  static readonly resourceGroupName: string = "resourceGroupName";
  static readonly sqlEndpoint: string = "sqlEndpoint";
  static readonly sqlResourceId: string = "sqlResourceId";
  static readonly databaseName: string = "databaseName";
  static readonly skipAddingSqlUser: string = "skipAddingSqlUser";
  static readonly admin: string = "admin";
  static readonly adminPassword: string = "adminPassword";

  static readonly solution: string = "solution";
  static readonly solutionPluginFullName = "fx-solution-azure";

  static readonly solutionConfigKey = {
    resourceNameSuffix: "resourceNameSuffix",
    location: "location",
    tenantId: "tenantId",
  };

  static readonly identityPlugin: string = "fx-resource-identity";
  static readonly identityName: string = "identityName";

  static readonly questionKey = {
    adminName: "sql-admin-name",
    adminPassword: "sql-password",
    confirmPassword: "sql-confirm-password",
    skipAddingUser: "sql-skip-adding-user",
  };
}

export const ActionProvision = {
  name: "provision",
};

export const ActionConfigure = {
  name: "configure",
};

export const ActionGenerateBicep = {
  name: "generateBicep",
};

export class Telemetry {
  static readonly componentName = "fx-resource-azure-sql";

  static readonly stage = {
    preProvision: "pre-provision",
    postProvision: "post-provision",
    getQuestion: "get-question",
    generateArmTemplates: "generate-arm-templates",
  };

  static readonly properties = {
    skipAddingUser: "skip-adding-user",
    dbCount: "db-count",
    dbOnly: "db-only",
  };
}

export class HelpLinks {
  static readonly default = "https://aka.ms/teamsfx-sql-help";
}

export class AzureSqlBicep {
  static readonly sqlResourceId: string = "provisionOutputs.azureSqlOutput.value.sqlResourceId";
  static readonly sqlEndpoint: string = "provisionOutputs.azureSqlOutput.value.sqlEndpoint";
  static readonly databaseName: string = "provisionOutputs.azureSqlOutput.value.databaseName";
}

export class AzureSqlBicepFile {
  static readonly moduleTemplateFileName: string = "provision.template.bicep";
  static readonly ProvisionModuleTemplateFileName = "sqlProvision.template.bicep";
  static readonly newDatabaseOrchestrationTemplateFileName: string =
    "newDatabase.orchestration.template.bicep";
  static readonly newDatabaseProvisionTemplateFileName = "newDatabaseProvision.template.bicep";
}

export const Message = {
  skipAddAadAdmin: `skip adding existing aad admin`,
  addFirewall: `add firewall`,
  addSqlAadAdmin: `add SQL aad admin`,

  addDatabaseUser: (name: string) => `add database user ${name}`,
};
