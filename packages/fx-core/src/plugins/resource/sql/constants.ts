// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export class Constants {
    public static readonly pluginName: string = "SQL Plugin";
    public static readonly pluginNameShort: string = "SQL";
    public static readonly pluginFullName: string = "teamsfx-toolkit-plugin-azure-sql";

    public static readonly firewall = {
        azureIp: "0.0.0.0",
        azureRule: "AllowAzure",
        localRule: "AllowLocal"
    };

    public static readonly sqlAdministratorType: string = "ActiveDirectory";

    public static readonly echoIpAddress: string = "https://api.ipify.org";

    public static readonly azureSqlScope: string = "https://database.windows.net//.default";

    public static readonly sqlEndpoint: string = "sqlEndpoint";
    public static readonly databaseName: string = "databaseName";
    public static readonly skipAddingUser: string = "skipAddingUser";

    public static readonly solution: string = "solution";
    public static readonly solutionPluginFullName = "teamsfx-toolkit-solution-azure";

    public static readonly solutionConfigKey = {
        subscriptionId: "subscriptionId",
        resourceGroupName: "resourceGroupName",
        resourceNameSuffix: "resourceNameSuffix",
        location: "location",
        tenantId: "tenantId",
    };

    public static readonly identityPlugin: string = "teamsfx-toolkit-plugin-identity";
    public static readonly identity: string = "identity";

    public static readonly userQuestion = {
        adminName: "Admin name of SQL",
        adminPassword: "Admin password of SQL",
        confirmPassword: "Confirm admin password of SQL",
    };

    public static readonly questionKey = {
        adminName: "sql-admin-name",
        adminPassword: "sql-password",
        confirmPassword: "sql-confirm-password",
    };
}

export class Telemetry {
    static readonly telemetryName = "teamsfx-toolkit-plugin-sql";
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
    //TODO: update helplink
    static readonly addDBUser = "";
}