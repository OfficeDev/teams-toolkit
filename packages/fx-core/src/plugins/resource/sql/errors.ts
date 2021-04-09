// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "./constants";

export class ErrorMessage {

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
        message: (sqlName: string, reason = "") => `create SQL server ${sqlName} failed. ${reason}`
    };

    public static readonly DatabaseCreateError = {
        name: "SqlDBCreateError",
        message: (databaseName: string, reason = "") => `create database ${databaseName} failed. ${reason}`
    };

    public static readonly DatabaseUserCreateError = {
        name: "DatabaseUserCreateError",
        message: (sqlName: string, database: string, user: string, reason = "") => `database ${sqlName}.${database} create user ${user} failed. ${reason}`
    };

    public static readonly SqlAddAdminError = {
        name: "SqlAddAdminError",
        message: (account: string, reason = "") => `add aad admin ${account} into SQL failed. ${reason}`
    };

    public static readonly SqlAzureFirwallError = {
        name: "SqlAzureFirwallError",
        message: (sqlName: string, reason = "") => `${sqlName} add azure firewall failed. ${reason}`
    };

    public static readonly SqlLocalFirwallError = {
        name: "SqlLocalFirwallError",
        message: (sqlName: string, reason = "") => `${sqlName} add local firewall failed. ${reason}`
    };

    public static readonly SqlDeleteLocalFirwallError = {
        name: "SqlDeleteLocalFirwallError",
        message: (sqlName: string, reason = "") => `${sqlName} delete local firewall failed. You can delete ${Constants.firewall.localRule} manually. ${reason}`
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
        message: (sqlName: string, reason = "") => `check SQL server ${sqlName} failed. ${reason}`
    };

    public static readonly SqlCheckDBError = {
        name: "SqlCheckDBError",
        message: (databaseName: string, reason = "") => `check database ${databaseName} failed. ${reason}`
    };

    public static readonly SqlCheckAdminError = {
        name: "SqlCheckAdminError",
        message: (identity: string, reason = "") => `check aad admin ${identity} failed. ${reason}`
    };

    public static readonly SqlCheckDBUserError = {
        name: "SqlCheckDBUserError",
        message: (user: string, reason = "") => `check database user ${user} failed. ${reason}`
    };

    public static readonly UnhandledError = {
        name: "UnhandledError",
        message: () => "Unhandled Error"
    };
}