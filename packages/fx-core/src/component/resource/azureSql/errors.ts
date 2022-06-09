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
      getDefaultString(`error.sql.${ErrorMessage.SqlInputError.name}`),
      getLocalizedString(`error.sql.${ErrorMessage.SqlInputError.name}`),
    ],
  };

  public static readonly SqlAskInputError = {
    name: "SqlAskInputError",
    message: (): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlAskInputError.name}`),
      getLocalizedString(`error.sql.${ErrorMessage.SqlAskInputError.name}`),
    ],
  };

  public static readonly SqlEndpointError = {
    name: "SqlEndpointError",
    message: (sqlName: string): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlEndpointError.name}`, sqlName),
      getLocalizedString(`error.sql.${ErrorMessage.SqlEndpointError.name}`, sqlName),
    ],
  };

  public static readonly DatabaseUserCreateError = {
    name: "DatabaseUserCreateError",
    message: (database: string, user: string): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.DatabaseUserCreateError.name}`, user, database),
      getLocalizedString(`error.sql.${ErrorMessage.DatabaseUserCreateError.name}`, user, database),
    ],
  };

  public static readonly SqlAddAdminError = {
    name: "SqlAddAdminError",
    message: (account: string, detail = ""): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlAddAdminError.name}`, account, detail),
      getLocalizedString(`error.sql.${ErrorMessage.SqlAddAdminError.name}`, account, detail),
    ],
  };

  public static readonly SqlLocalFirwallError = {
    name: "SqlLocalFirwallError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlLocalFirwallError.name}`, sqlName, detail),
      getLocalizedString(`error.sql.${ErrorMessage.SqlLocalFirwallError.name}`, sqlName, detail),
    ],
  };

  public static readonly SqlDeleteLocalFirwallError = {
    name: "SqlDeleteLocalFirwallError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString(
        `error.sql.${ErrorMessage.SqlDeleteLocalFirwallError.name}`,
        sqlName,
        Constants.firewall.localRule,
        detail
      ),
      getLocalizedString(
        `error.sql.${ErrorMessage.SqlDeleteLocalFirwallError.name}`,
        sqlName,
        Constants.firewall.localRule,
        detail
      ),
    ],
  };

  public static readonly SqlUserInfoError = {
    name: "SqlUserInfoError",
    message: (): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlUserInfoError.name}`),
      getLocalizedString(`error.sql.${ErrorMessage.SqlUserInfoError.name}`),
    ],
  };

  public static readonly SqlGetConfigError = {
    name: "SqlGetConfigError",
    message: (pluginId: string, configKey: string): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlGetConfigError.name}`, configKey, pluginId),
      getLocalizedString(`error.sql.${ErrorMessage.SqlGetConfigError.name}`, configKey, pluginId),
    ],
  };

  public static readonly SqlInvalidConfigError = {
    name: "SqlInvalidConfigError",
    message: (configKey: string, reason: string): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlInvalidConfigError.name}`, configKey, reason),
      getLocalizedString(`error.sql.${ErrorMessage.SqlInvalidConfigError.name}`, configKey, reason),
    ],
  };

  public static readonly SqlCheckError = {
    name: "SqlCheckError",
    message: (sqlName: string, detail = ""): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlCheckError.name}`, sqlName, detail),
      getLocalizedString(`error.sql.${ErrorMessage.SqlCheckError.name}`, sqlName, detail),
    ],
  };

  public static readonly SqlCheckAdminError = {
    name: "SqlCheckAdminError",
    message: (identity: string, detail = ""): [string, string] => [
      getDefaultString(`error.sql.${ErrorMessage.SqlCheckAdminError.name}`, identity, detail),
      getLocalizedString(`error.sql.${ErrorMessage.SqlCheckAdminError.name}`, identity, detail),
    ],
  };

  public static readonly UnhandledError = {
    name: "UnhandledError",
    message: (): [string, string] => ["Unhandled Error", "Unhandled Error"],
  };

  public static readonly IdentityCredentialUndefine = (user: string, databaseName: string) =>
    getLocalizedString(`error.sql.IdentityCredentialUndefine`, user, databaseName);

  public static readonly ServicePrincipalWarning = (user: string, databaseName: string) =>
    getLocalizedString(`error.sql.ServicePrincipalWarning`, user, databaseName);

  public static readonly DomainCode = "AADSTS53000";

  public static readonly DomainError = getLocalizedString(
    `error.sql.DomainError`,
    getLocalizedString("error.sql.GetDetail")
  );

  public static readonly GuestAdminMessage =
    "Server identity does not have Azure Active Directory Readers permission";

  public static readonly FirewallErrorReg =
    /Client with IP address .*? is not allowed to access the server./g;

  public static readonly GuestAdminError = getLocalizedString(
    `error.sql.GuestAdminError`,
    getLocalizedString("error.sql.GetDetail")
  );
}
