// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants } from "../constants";

export class Message {
  public static readonly startPreProvision = `[${Constants.pluginName}] start preProvision`;
  public static readonly startPostProvision = `[${Constants.pluginName}] start postProvision`;

  public static readonly endPreProvision = `[${Constants.pluginName}] end preProvision`;
  public static readonly endPostProvision = `[${Constants.pluginName}] end postProvision`;

  public static readonly checkAadAdmin = `[${Constants.pluginName}] check aad admin`;
  public static readonly connectDatabase = `[${Constants.pluginName}] connect database`;

  public static readonly skipAddAadAdmin = `[${Constants.pluginName}] skip adding existing aad admin`;
  public static readonly skipAddUser = `[${Constants.pluginName}] skip adding user`;

  public static readonly addFirewall = `[${Constants.pluginName}] add firewall`;
  public static readonly addSqlAadAdmin = `[${Constants.pluginName}] add SQL aad admin`;
  public static readonly addTable = `[${Constants.pluginName}] add table`;

  public static readonly addDatabaseUser = (name: string) =>
    `[${Constants.pluginName}] add database user ${name}`;

  public static readonly adminName = (name: string) =>
    `[${Constants.pluginName}] AAD admin name is ${name}`;
}
