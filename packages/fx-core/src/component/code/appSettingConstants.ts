// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class AppSettingConstants {
  static DevelopmentFileName = "appsettings.Development.json";
  static Placeholders = {
    clientId: "$clientId$",
    clientSecret: "$client-secret$",
    oauthAuthority: "$oauthAuthority$",
    botId: "$botId$",
    botPassword: "$bot-password$",
  };

  static RegularExpr = {
    clientId: /\$clientId\$/g,
    clientSecret: /\$client-secret\$/g,
    oauthAuthority: /\$oauthAuthority\$/g,
    botId: /\$botId\$/g,
    botPassword: /\$bot-password\$/g,
  };
}
