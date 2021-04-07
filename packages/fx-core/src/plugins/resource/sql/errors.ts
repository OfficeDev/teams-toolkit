// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "./constants";

export class ErrorMessage {

    public static readonly ShowDetailMessage = "Get the detail error message in output";

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
        message: (sqlName: string) => `create SQL server ${sqlName} failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly DatabaseCreateError = {
        name: "SqlDBCreateError",
        message: (databaseName: string) => `create database ${databaseName} failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly DatabaseUserCreateError = {
        name: "DatabaseUserCreateError",
        message: (sqlName: string, database: string, user: string) => `database ${sqlName}.${database} create user ${user} failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlAddAdminError = {
        name: "SqlAddAdminError",
        message: (account: string) => `add aad admin ${account} into SQL failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlAzureFirwallError = {
        name: "SqlAzureFirwallError",
        message: (sqlName: string) => `${sqlName} add azure firewall failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlLocalFirwallError = {
        name: "SqlLocalFirwallError",
        message: (sqlName: string) => `${sqlName} add local firewall failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlDeleteLocalFirwallError = {
        name: "SqlDeleteLocalFirwallError",
        message: (sqlName: string) => `${sqlName} delete local firewall failed. You can delete ${Constants.firewall.localRule} manually. ${ErrorMessage.ShowDetailMessage}`
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
        message: (sqlName: string) => `check SQL server ${sqlName} failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlCheckDBError = {
        name: "SqlCheckDBError",
        message: (databaseName: string) => `check database ${databaseName} failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlCheckAdminError = {
        name: "SqlCheckAdminError",
        message: (identity: string) => `check aad admin ${identity} failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlCheckDBUserError = {
        name: "SqlCheckDBUserError",
        message: (user: string) => `check database user ${user} failed. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly UnhandledError = {
        name: "UnhandledError",
        message: () => "Unhandled Error"
    };
}