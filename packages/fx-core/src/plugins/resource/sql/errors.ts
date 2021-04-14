// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Constants } from "./constants";

export class ErrorMessage {

    public static readonly GetDetail = "Get the detail error message in output";

    public static readonly SqlInputError = {
        name: "SqlInputError",
        message: () => "sql admin name or password is empty"
    };

    public static readonly SqlEndpointError = {
        name: "SqlEndpointError",
        message: (sqlName: string) => `SQL server ${sqlName} is invalid.`
    };

    public static readonly SqlCreateError = {
        name: "SqlCreateError",
        message: (sqlName: string, detail = "") => `create SQL server ${sqlName} failed. ${detail}`
    };

    public static readonly DatabaseCreateError = {
        name: "SqlDBCreateError",
        message: (databaseName: string, detail = "") => `create database ${databaseName} failed. ${detail}`
    };

    public static readonly DatabaseUserCreateError = {
        name: "DatabaseUserCreateError",
        message: (sqlName: string, database: string, user: string, detail = "") => `database ${sqlName}.${database} create user ${user} failed. ${detail}`
    };

    public static readonly SqlAddAdminError = {
        name: "SqlAddAdminError",
        message: (account: string, detail = "") => `add aad admin ${account} into SQL failed. ${detail}`
    };

    public static readonly SqlAzureFirwallError = {
        name: "SqlAzureFirwallError",
        message: (sqlName: string, detail = "") => `${sqlName} add azure firewall failed. ${detail}`
    };

    public static readonly SqlLocalFirwallError = {
        name: "SqlLocalFirwallError",
        message: (sqlName: string, detail = "") => `${sqlName} add local firewall failed. ${detail}`
    };

    public static readonly SqlDeleteLocalFirwallError = {
        name: "SqlDeleteLocalFirwallError",
        message: (sqlName: string, detail = "") => `${sqlName} delete local firewall failed. You can delete ${Constants.firewall.localRule} manually. ${detail}`
    };

    public static readonly SqlUserInfoError = {
        name: "SqlUserInfoError",
        message: () => "get login user info failed."
    };

    public static readonly SqlGetConfigError = {
        name: "SqlGetConfigError",
        message: (pluginId: string, configKey: string) => `Failed to get config value of '${configKey}' from '${pluginId}'.`,
    };

    public static readonly SqlCheckError = {
        name: "SqlCheckError",
        message: (sqlName: string, detail = "") => `check SQL server ${sqlName} failed. ${detail}`
    };

    public static readonly SqlCheckDBError = {
        name: "SqlCheckDBError",
        message: (databaseName: string, detail = "") => `check database ${databaseName} failed. ${detail}`
    };

    public static readonly SqlCheckAdminError = {
        name: "SqlCheckAdminError",
        message: (identity: string, detail = "") => `check aad admin ${identity} failed. ${detail}`
    };

    public static readonly SqlCheckDBUserError = {
        name: "SqlCheckDBUserError",
        message: (user: string, detail = "") => `check database user ${user} failed. ${detail}`
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