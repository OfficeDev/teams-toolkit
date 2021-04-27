// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class Constants {
    public static readonly pluginName: string = "SQL Plugin";
    public static readonly pluginNameShort: string = "SQL";
    public static readonly pluginFullName: string = "fx-resource-azure-sql";

    public static readonly firewall = {
        azureIp: "0.0.0.0",
        azureRule: "AllowAzure",
        localRule: "AllowLocal"
    };

    public static readonly jwtToken = {
        ver1: "1.0",
        ver2: "2.0",
        userType: "0",
    };

    public static readonly sqlAdministratorType: string = "ActiveDirectory";

    public static readonly echoIpAddress: string = "https://api.ipify.org";

    public static readonly azureSqlScope: string = "https://database.windows.net//.default";

    public static readonly sqlEndpoint: string = "sqlEndpoint";
    public static readonly databaseName: string = "databaseName";
    public static readonly skipAddingUser: string = "skipAddingUser";

    public static readonly solution: string = "solution";
    public static readonly solutionPluginFullName = "fx-solution-azure";

    public static readonly solutionConfigKey = {
        subscriptionId: "subscriptionId",
        resourceGroupName: "resourceGroupName",
        resourceNameSuffix: "resourceNameSuffix",
        location: "location",
        tenantId: "tenantId",
    };

    public static readonly identityPlugin: string = "fx-resource-identity";
    public static readonly identity: string = "identity";

    public static readonly userQuestion = {
        adminName: "Admin name of SQL",
        adminPassword: "Admin password of SQL",
        confirmPassword: "Confirm admin password of SQL",
        skipAddingUser: "skip adding database user",
    };

    public static readonly questionKey = {
        adminName: "sql-admin-name",
        adminPassword: "sql-password",
        confirmPassword: "sql-confirm-password",
        skipAddingUser: "sql-skip-adding-user",
    };
}

export class Telemetry {
    static readonly telemetryName = "fx-resource-azure-sql";
    static readonly provisionStart = `${Telemetry.telemetryName}/provision-start`;
    static readonly provisionEnd = `${Telemetry.telemetryName}/provision`;
    static readonly postProvisionStart = `${Telemetry.telemetryName}/post-provision-start`;
    static readonly postProvisionEnd = `${Telemetry.telemetryName}/post-provision`;

    static readonly component = "component";
    static readonly success = "success";
    static readonly errorType = "error-type";
    static readonly errorMessage = "error-message";

    static readonly getErrorProperty = (errorType: string, errorMessage: string) => {
        return {
            "error-type": errorType,
            "error-message": errorMessage,
        };
    };
}

export class HelpLinks {
    static readonly addDBUser = "https://aka.ms/teamsfx-sql-help";
}