// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getLocalizedString } from "../../../../common/localizeUtils";
import { Constants } from "../constants";

export class Message {
  public static readonly startPreProvision = getLocalizedString(
    "plugins.sql.message.startPreProvision",
    Constants.pluginNameShort
  );

  public static readonly startPostProvision = getLocalizedString(
    "plugins.sql.message.startPostProvision",
    Constants.pluginNameShort
  );

  public static readonly endPreProvision = getLocalizedString(
    "plugins.sql.message.endPreProvision",
    Constants.pluginNameShort
  );

  public static readonly endPostProvision = getLocalizedString(
    "plugins.sql.message.endPostProvision",
    Constants.pluginNameShort
  );

  public static readonly skipAddAadAdmin = getLocalizedString(
    "plugins.sql.message.skipAddAadAdmin",
    Constants.pluginNameShort
  );

  public static readonly addSqlAadAdmin = getLocalizedString(
    "plugins.sql.message.addSqlAadAdmin",
    Constants.pluginNameShort
  );

  public static readonly addFirewall = getLocalizedString(
    "plugins.sql.message.addFirewall",
    Constants.pluginNameShort
  );

  public static readonly addDatabaseUser = (name: string) =>
    getLocalizedString("plugins.sql.message.addDatabaseUser", Constants.pluginNameShort, name);

  public static readonly adminName = (name: string) =>
    getLocalizedString("plugins.sql.message.adminName", Constants.pluginNameShort, name);
}
