// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { Constants } from "./constants";

export class ErrorMessage {
  public static readonly LinkHelpMessage = (link: string) =>
    getLocalizedString("plugins.sql.errorMessage.LinkHelpMessage", link);

  public static readonly SqlInputError = {
    name: "SqlInputError",
    message: (): [string, string] => [
      getDefaultString(`plugins.sql.errorMessage.${ErrorMessage.SqlInputError.name}`),
      getLocalizedString(`plugins.sql.errorMessage.${ErrorMessage.SqlInputError.name}`),
    ],
  };

  public static readonly SqlAskInputError = {
    name: "SqlAskInputError",
    message: (): [string, string] => [
      getDefaultString(`plugins.sql.errorMessage.${ErrorMessage.SqlAskInputError.name}`),
      getLocalizedString(`plugins.sql.errorMessage.${ErrorMessage.SqlAskInputError.name}`),
    ],
  };

  public static readonly SqlEndpointError = {
    name: "SqlEndpointError",
    message: (sqlName: string): [string, string] => [
      getDefaultString(`plugins.sql.errorMessage.${ErrorMessage.SqlEndpointError.name}`, sqlName),
      getLocalizedString(`plugins.sql.errorMessage.${ErrorMessage.SqlEndpointError.name}`, sqlName),
    ],
  };

  public static readonly DatabaseUserCreateError = {
    name: "DatabaseUserCreateError",
    message: (database: string, user: string): [string, string] => [
      getDefaultString(
        `plugins.sql.errorMessage.${ErrorMessage.DatabaseUserCreateError.name}`,
        user,
        database
      ),
      getLocalizedString(
        `plugins.sql.errorMessage.${ErrorMessage.DatabaseUserCreateError.name}`,
        user,
        database
      ),
    ],
  };

  public static readonly SqlAddAdminError = {
    name: "SqlAddAdminError",
    message: (account: string, detail = ""): [string, string] => [
      getDefaultString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlAddAdminError.name}`,
        account,
        detail
      ),
      getLocalizedString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlAddAdminError.name}`,
        account,
        detail
      ),
    ],
  };

  public static readonly SqlLocalFirwallError = {
    name: "SqlLocalFirwallError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlLocalFirwallError.name}`,
        sqlName,
        detail
      ),
      getLocalizedString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlLocalFirwallError.name}`,
        sqlName,
        detail
      ),
    ],
  };

  public static readonly SqlDeleteLocalFirwallError = {
    name: "SqlDeleteLocalFirwallError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlDeleteLocalFirwallError.name}`,
        sqlName,
        Constants.firewall.localRule,
        detail
      ),
      getLocalizedString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlDeleteLocalFirwallError.name}`,
        sqlName,
        Constants.firewall.localRule,
        detail
      ),
    ],
  };

  public static readonly SqlUserInfoError = {
    name: "SqlUserInfoError",
    message: (): [string, string] => [
      getDefaultString(`plugins.sql.errorMessage.${ErrorMessage.SqlUserInfoError.name}`),
      getLocalizedString(`plugins.sql.errorMessage.${ErrorMessage.SqlUserInfoError.name}`),
    ],
  };

  public static readonly SqlGetConfigError = {
    name: "SqlGetConfigError",
    message: (pluginId: string, configKey: string): [string, string] => [
      getDefaultString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlGetConfigError.name}`,
        configKey,
        pluginId
      ),
      getLocalizedString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlGetConfigError.name}`,
        configKey,
        pluginId
      ),
    ],
  };

  public static readonly SqlInvalidConfigError = {
    name: "SqlInvalidConfigError",
    message: (configKey: string, reason: string): [string, string] => [
      getDefaultString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlInvalidConfigError.name}`,
        configKey,
        reason
      ),
      getLocalizedString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlInvalidConfigError.name}`,
        configKey,
        reason
      ),
    ],
  };

  public static readonly SqlCheckError = {
    name: "SqlCheckError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlCheckError.name}`,
        sqlName,
        detail
      ),
      getLocalizedString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlCheckError.name}`,
        sqlName,
        detail
      ),
    ],
  };

  public static readonly SqlCheckAdminError = {
    name: "SqlCheckAdminError",
    message: (identity: string, detail = ""): [string, string] => [
      getDefaultString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlCheckAdminError.name}`,
        identity,
        detail
      ),
      getLocalizedString(
        `plugins.sql.errorMessage.${ErrorMessage.SqlCheckAdminError.name}`,
        identity,
        detail
      ),
    ],
  };

  public static readonly UnhandledError = {
    name: "UnhandledError",
    message: (): [string, string] => ["Unhandled Error", "Unhandled Error"],
  };

  public static readonly IdentityCredentialUndefine = (user: string, databaseName: string) =>
    getLocalizedString(`plugins.sql.errorMessage.IdentityCredentialUndefine`, user, databaseName);

  public static readonly ServicePrincipalWarning = (user: string, databaseName: string) =>
    getLocalizedString(`plugins.sql.errorMessage.ServicePrincipalWarning`, user, databaseName);

  public static readonly DomainCode = "AADSTS53000";

  public static readonly DomainError = getLocalizedString(
    `plugins.sql.errorMessage.DomainError`,
    getLocalizedString("plugins.sql.errorMessage.GetDetail")
  );

  public static readonly GuestAdminMessage =
    "Server identity does not have Azure Active Directory Readers permission";

  public static readonly FirewallErrorReg =
    /Client with IP address .*? is not allowed to access the server./g;

  public static readonly GuestAdminError = getLocalizedString(
    `plugins.sql.errorMessage.GuestAdminError`,
    getLocalizedString("plugins.sql.errorMessage.GetDetail")
  );
}
