// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { Constants } from "./constants";

export class ErrorMessage {
  public static readonly LinkHelpMessage = (link: string) =>
    getLocalizedString("error.sql.LinkHelpMessage", link);

  public static readonly SqlInputError = {
    name: "SqlInputError",
    message: (): [string, string] => [
      getDefaultString("error.sql.SqlInputError"),
      getLocalizedString("error.sql.SqlInputError"),
    ],
  };

  public static readonly SqlAskInputError = {
    name: "SqlAskInputError",
    message: (): [string, string] => [
      getDefaultString("error.sql.SqlAskInputError"),
      getLocalizedString("error.sql.SqlAskInputError"),
    ],
  };

  public static readonly SqlEndpointError = {
    name: "SqlEndpointError",
    message: (sqlName: string): [string, string] => [
      getDefaultString("error.sql.SqlEndpointError", sqlName),
      getLocalizedString("error.sql.SqlEndpointError", sqlName),
    ],
  };

  public static readonly DatabaseUserCreateError = {
    name: "DatabaseUserCreateError",
    message: (database: string, user: string): [string, string] => [
      getDefaultString("error.sql.DatabaseUserCreateError", user, database),
      getLocalizedString("error.sql.DatabaseUserCreateError", user, database),
    ],
  };

  public static readonly SqlAddAdminError = {
    name: "SqlAddAdminError",
    message: (account: string, detail = ""): [string, string] => [
      getDefaultString("error.sql.SqlAddAdminError", account, detail),
      getLocalizedString("error.sql.SqlAddAdminError", account, detail),
    ],
  };

  public static readonly SqlLocalFirwallError = {
    name: "SqlLocalFirwallError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString("error.sql.SqlLocalFirwallError", sqlName, detail),
      getLocalizedString("error.sql.SqlLocalFirwallError", sqlName, detail),
    ],
  };

  public static readonly SqlDeleteLocalFirwallError = {
    name: "SqlDeleteLocalFirwallError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString(
        "error.sql.SqlDeleteLocalFirwallError",
        sqlName,
        Constants.firewall.localRule,
        detail
      ),
      getLocalizedString(
        "error.sql.SqlDeleteLocalFirwallError",
        sqlName,
        Constants.firewall.localRule,
        detail
      ),
    ],
  };

  public static readonly SqlUserInfoError = {
    name: "SqlUserInfoError",
    message: (): [string, string] => [
      getDefaultString("error.sql.SqlUserInfoError"),
      getLocalizedString("error.sql.SqlUserInfoError"),
    ],
  };

  public static readonly SqlGetConfigError = {
    name: "SqlGetConfigError",
    message: (pluginId: string, configKey: string): [string, string] => [
      getDefaultString("error.sql.SqlGetConfigError", configKey, pluginId),
      getLocalizedString("error.sql.SqlGetConfigError", configKey, pluginId),
    ],
  };

  public static readonly SqlInvalidConfigError = {
    name: "SqlInvalidConfigError",
    message: (configKey: string, reason: string): [string, string] => [
      getDefaultString("error.sql.SqlInvalidConfigError", configKey, reason),
      getLocalizedString("error.sql.SqlInvalidConfigError", configKey, reason),
    ],
  };

  public static readonly SqlCheckError = {
    name: "SqlCheckError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString("error.sql.SqlCheckError", sqlName, detail),
      getLocalizedString("error.sql.SqlCheckError", sqlName, detail),
    ],
  };

  public static readonly SqlCheckAdminError = {
    name: "SqlCheckAdminError",
    message: (identity: string, detail = ""): [string, string] => [
      getDefaultString("error.sql.SqlCheckAdminError", identity, detail),
      getLocalizedString("error.sql.SqlCheckAdminError", identity, detail),
    ],
  };

  public static readonly UnhandledError = {
    name: "UnhandledError",
    message: (): [string, string] => ["Unhandled Error", "Unhandled Error"],
  };

  public static readonly IdentityCredentialUndefine = (user: string, databaseName: string) =>
    getLocalizedString("error.sql.IdentityCredentialUndefine", user, databaseName);

  public static readonly ServicePrincipalWarning = (user: string, databaseName: string) =>
    getLocalizedString("error.sql.ServicePrincipalWarning", user, databaseName);

  public static readonly DomainCode = "AADSTS53000";

  public static readonly DomainError = getLocalizedString(
    "error.sql.DomainError",
    getLocalizedString("error.sql.GetDetail")
  );

  public static readonly GuestAdminMessage =
    "Server identity does not have Azure Active Directory Readers permission";

  public static readonly FirewallErrorReg =
    /Client with IP address .*? is not allowed to access the server./g;

  public static readonly GuestAdminError = getLocalizedString(
    "error.sql.GuestAdminError",
    getLocalizedString("error.sql.GetDetail")
  );
}
