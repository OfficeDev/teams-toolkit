// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Constants } from "../constants";

export class Message {
  public static readonly startPreProvision = `[${Constants.pluginName}] start preProvision`;
  public static readonly startProvision = `[${Constants.pluginName}] start provision`;
  public static readonly startPostProvision = `[${Constants.pluginName}] start postProvision`;
  public static readonly startGetQuestions = `[${Constants.pluginName}] start getQuestions`;

  public static readonly endPreProvision = `[${Constants.pluginName}] end preProvision`;
  public static readonly endProvision = `[${Constants.pluginName}] end provision`;
  public static readonly endPostProvision = `[${Constants.pluginName}] end postProvision`;
  public static readonly endGetQuestions = `[${Constants.pluginName}] end getQuestions`;

  public static readonly provisionSql = `[${Constants.pluginName}] provision SQL`;
  public static readonly provisionDatabase = `[${Constants.pluginName}] provision database`;

  public static readonly checkSql = `[${Constants.pluginName}] check SQL server`;
  public static readonly checkDatabase = `[${Constants.pluginName}] check database`;
  public static readonly checkAadAdmin = `[${Constants.pluginName}] check aad admin`;
  public static readonly checkDatabaseUser = `[${Constants.pluginName}] check database user`;
  public static readonly connectDatabase = `[${Constants.pluginName}] connect database`;

  public static readonly skipProvisionSql = `[${Constants.pluginName}] skip provisioning existing SQL`;
  public static readonly skipProvisionDatabase = `[${Constants.pluginName}] skip provisioning existing database`;
  public static readonly skipAddAadAdmin = `[${Constants.pluginName}] skip adding existing aad admin`;
  public static readonly skipAddUser = `[${Constants.pluginName}] skip adding user`;

  public static readonly addFirewall = `[${Constants.pluginName}] add firewall`;
  public static readonly addSqlAadAdmin = `[${Constants.pluginName}] add SQL aad admin`;
  public static readonly addTable = `[${Constants.pluginName}] add table`;

  public static readonly existUser = (name: string) =>
    `[${Constants.pluginName}] database user ${name} already exists in database`;

  public static readonly addDatabaseUser = (name: string) =>
    `[${Constants.pluginName}] add database user ${name}`;

  public static readonly adminName = (name: string) =>
    `[${Constants.pluginName}] AAD admin name is ${name}`;

  public static readonly endpoint = (endpoint: string) =>
    `[${Constants.pluginName}] SQL endpoint is ${endpoint}`;

  public static readonly inputCheck = {
    sqlUserNameEmpty: "SQL admin user name cannot be empty",
    sqlUserNameContainsSqlIdentifier:
      "SQL admin user name cannot contain a SQL Identifier or a typical system name (like admin, administrator, sa, root, dbmanager, loginmanager, etc.) or a built-in database user or role (like dbo, guest, public, etc.)",
    sqlUserNameContainsNonAlphanumeric:
      "SQL admin user name cannot include non-alphanumeric characters",
    sqlUserNameStartWithNumber: "SQL admin user name cannot start with a number",
    sqlPasswordEmpty: "SQL admin password cannot be empty",
    sqlPasswordLengthLessThan8: "SQL admin password must be at least 8 characters in length",
    sqlPasswordLengthGreatThan128:
      "SQL admin password must be no more than 128 characters in length",
    sqlPasswordMustContain3Categories:
      "Your password must contain characters from three of the following categories – English uppercase letters, English lowercase letters, numbers (0-9), and non-alphanumeric characters (!, $, #, %, etc.)",
    sqlPasswordCannotContainUserName: "Your password cannot contain part or all of the user name",
    sqlPasswordMustMatch: "Password and password confirmation must match",
  };
}
