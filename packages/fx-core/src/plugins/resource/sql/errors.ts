// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Constants } from "./constants";

export class ErrorMessage {

    public static readonly GetDetail = "Get the detail error message in output";

    public static readonly SqlInputError = {
        name: "SqlInputError",
        message: () => "SQL admin name or password is empty"
    };

    public static readonly SqlEndpointError = {
        name: "SqlEndpointError",
        message: (sqlName: string) => `SQL server '${sqlName}' is invalid.`
    };

    public static readonly SqlCreateError = {
        name: "SqlCreateError",
        message: (sqlName: string, detail = "") => `Failed to create SQL server '${sqlName}'. ${detail}`
    };

    public static readonly DatabaseCreateError = {
        name: "SqlDBCreateError",
        message: (databaseName: string, detail = "") => `Failed to create database '${databaseName}'. ${detail}`
    };

    public static readonly DatabaseUserCreateError = {
        name: "DatabaseUserCreateError",
        message: (sqlName: string, database: string, user: string, detail = "") => `Failed to create user '${user}' in database '${sqlName}.${database}'. ${detail}`
    };

    public static readonly SqlAddAdminError = {
        name: "SqlAddAdminError",
        message: (account: string, detail = "") => `Failed to add AAD admin '${account}'. ${detail}`
    };

    public static readonly SqlAzureFirwallError = {
        name: "SqlAzureFirwallError",
        message: (sqlName: string, detail = "") => `Failed to add Azure Firewall for '${sqlName}'. ${detail}`
    };

    public static readonly SqlLocalFirwallError = {
        name: "SqlLocalFirwallError",
        message: (sqlName: string, detail = "") => `Failed to add local firewall for '${sqlName}'. ${detail}`
    };

    public static readonly SqlDeleteLocalFirwallError = {
        name: "SqlDeleteLocalFirwallError",
        message: (sqlName: string, detail = "") => `Failed to delete local firewall for '${sqlName}'. Delete '${Constants.firewall.localRule}' manually. ${detail}`
    };

    public static readonly SqlUserInfoError = {
        name: "SqlUserInfoError",
        message: () => "Failed to get login user info."
    };

    public static readonly SqlGetConfigError = {
        name: "SqlGetConfigError",
        message: (pluginId: string, configKey: string) => `Failed to get config value of '${configKey}' from '${pluginId}'.`,
    };

    public static readonly SqlCheckError = {
        name: "SqlCheckError",
        message: (sqlName: string, detail = "") => `Failed to check SQL server '${sqlName}'. ${detail}`
    };

    public static readonly SqlCheckDBError = {
        name: "SqlCheckDBError",
        message: (databaseName: string, detail = "") => `Failed to check database '${databaseName}'. ${detail}`
    };

    public static readonly SqlCheckAdminError = {
        name: "SqlCheckAdminError",
        message: (identity: string, detail = "") => `Failed to check AAD admin '${identity}'. ${detail}`
    };

    public static readonly SqlCheckDBUserError = {
        name: "SqlCheckDBUserError",
        message: (user: string, detail = "") => `Failed to check database user '${user}'. ${detail}`
    };

    public static readonly UnhandledError = {
        name: "UnhandledError",
        message: () => "Unhandled Error"
    };

    public static readonly IdentityCredentialUndefine = (user: string, databaseName: string) => `Cannot access database to add managed identity user ${user}. Please add the user for database ${databaseName} manually`;

    public static readonly ServicePrincipalWarning = (user: string, databaseName: string) => `service principal admin in azure sql can't add database user <${user}>. You can add the user for ${databaseName} manually`;

    public static readonly DomainCode = "AADSTS53000";

    public static readonly DomainError = `Conditional Access policy requires a compliant device, and the device is not compliant. ${ErrorMessage.GetDetail}`;

    public static readonly GuestAdminMessage = "Server identity does not have Azure Active Directory Readers permission";

    public static readonly GuestAdminError = `SQL admin does not have enough permission to add database user. ${ErrorMessage.GetDetail}`;
}