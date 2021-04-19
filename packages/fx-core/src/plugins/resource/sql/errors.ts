// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "./constants";

export class ErrorMessage {

    public static readonly ShowDetailMessage = "Get the detail error message in output";

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
        message: (sqlName: string) => `Failed to create SQL server '${sqlName}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly DatabaseCreateError = {
        name: "SqlDBCreateError",
        message: (databaseName: string) => `Failed to create database '${databaseName}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly DatabaseUserCreateError = {
        name: "DatabaseUserCreateError",
        message: (sqlName: string, database: string, user: string) => `Failed to create user '${user}' in database '${sqlName}.${database}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlAddAdminError = {
        name: "SqlAddAdminError",
        message: (account: string) => `Failed to add AAD admin '${account}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlAzureFirwallError = {
        name: "SqlAzureFirwallError",
        message: (sqlName: string) => `Failed to add Azure Firewall for '${sqlName}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlLocalFirwallError = {
        name: "SqlLocalFirwallError",
        message: (sqlName: string) => `Failed to add local firewall for '${sqlName}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlDeleteLocalFirwallError = {
        name: "SqlDeleteLocalFirwallError",
        message: (sqlName: string) => `Failed to delete local firewall for '${sqlName}'. Delete '${Constants.firewall.localRule}' manually. ${ErrorMessage.ShowDetailMessage}`
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
        message: (sqlName: string) => `Failed to check SQL server '${sqlName}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlCheckDBError = {
        name: "SqlCheckDBError",
        message: (databaseName: string) => `Failed to check database '${databaseName}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlCheckAdminError = {
        name: "SqlCheckAdminError",
        message: (identity: string) => `Failed to check AAD admin '${identity}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly SqlCheckDBUserError = {
        name: "SqlCheckDBUserError",
        message: (user: string) => `Failed to check database user '${user}'. ${ErrorMessage.ShowDetailMessage}`
    };

    public static readonly UnhandledError = {
        name: "UnhandledError",
        message: () => "Unhandled Error"
    };
}