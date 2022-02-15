// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Constants } from "./constants";

export class ErrorMessage {
  public static readonly GetDetail = "Get the detailed error message in output.";

  public static readonly LinkHelpMessage = (link: string) => `You can follow ${link} to handle it.`;

  public static readonly SqlInputError = {
    name: "SqlInputError",
    message: () => "SQL admin name or password is empty",
  };

  public static readonly SqlAskInputError = {
    name: "SqlAskInputError",
    message: () => "Failed to get answer for SQL questions",
  };

  public static readonly SqlEndpointError = {
    name: "SqlEndpointError",
    message: (sqlName: string) => `SQL Server '${sqlName}' is invalid.`,
  };

  public static readonly DatabaseUserCreateError = {
    name: "DatabaseUserCreateError",
    message: (database: string, user: string) =>
      `Failed to create user '${user}' in database ${database}`,
  };

  public static readonly SqlAddAdminError = {
    name: "SqlAddAdminError",
    message: (account: string, detail = "") => `Failed to add AAD admin '${account}'. ${detail}`,
  };

  public static readonly SqlLocalFirwallError = {
    name: "SqlLocalFirwallError",
    message: (sqlName: string, detail = "") =>
      `Failed to add local firewall for '${sqlName}'. ${detail}`,
  };

  public static readonly SqlDeleteLocalFirwallError = {
    name: "SqlDeleteLocalFirwallError",
    message: (sqlName: string, detail = "") =>
      `Failed to delete local firewall for '${sqlName}'. Delete '${Constants.firewall.localRule}' manually. ${detail}`,
  };

  public static readonly SqlUserInfoError = {
    name: "SqlUserInfoError",
    message: () => "Failed to get login user info.",
  };

  public static readonly SqlGetConfigError = {
    name: "SqlGetConfigError",
    message: (pluginId: string, configKey: string) =>
      `Failed to get config value of '${configKey}' from '${pluginId}'.`,
  };

  public static readonly SqlInvalidConfigError = {
    name: "SqlInvalidConfigError",
    message: (configKey: string, reason: string) =>
      `The config value of '${configKey}' is invalid for ${reason}.`,
  };

  public static readonly SqlCheckError = {
    name: "SqlCheckError",
    message: (sqlName: string, detail = "") => `Failed to check SQL Server '${sqlName}'. ${detail}`,
  };

  public static readonly SqlCheckAdminError = {
    name: "SqlCheckAdminError",
    message: (identity: string, detail = "") =>
      `Failed to check AAD admin '${identity}'. ${detail}`,
  };

  public static readonly SqlCheckDBUserError = {
    name: "SqlCheckDBUserError",
    message: (user: string, detail = "") => `Failed to check database user '${user}'. ${detail}`,
  };

  public static readonly SqlAccessError = {
    name: "SqlAccessError",
    message: (sqlName: string, detail = "") => `Failed to access server '${sqlName}'. ${detail}`,
  };

  public static readonly UnhandledError = {
    name: "UnhandledError",
    message: () => "Unhandled Error",
  };

  public static readonly IdentityCredentialUndefine = (user: string, databaseName: string) =>
    `Cannot access database to add managed identity user ${user}. Please add the user for database ${databaseName} manually`;

  public static readonly ServicePrincipalWarning = (user: string, databaseName: string) =>
    `service principal admin in azure sql can't add database user <${user}>. You can add the user for ${databaseName} manually`;

  public static readonly DomainCode = "AADSTS53000";

  public static readonly DomainError = `Conditional Access policy requires a compliant device, and the device is not compliant. ${ErrorMessage.GetDetail}`;

  public static readonly GuestAdminMessage =
    "Server identity does not have Azure Active Directory Readers permission";

  public static readonly FirewallErrorReg =
    /Client with IP address .*? is not allowed to access the server./g;

  public static readonly GuestAdminError = `SQL admin does not have enough permission to add database user. ${ErrorMessage.GetDetail}`;

  public static readonly AccessMessage = "is not allowed to access the server";
}
