// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export class LaunchBrowser {
  public static readonly chrome: string = "pwa-chrome";
  public static readonly edge: string = "pwa-msedge";
}

export class HubName {
  public static readonly teams: string = "Teams";
  public static readonly outlook: string = "Outlook";
  public static readonly office: string = "the Microsoft 365 app";
}

export class LaunchUrl {
  public static readonly teamsLocal: string =
    "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}";
  public static readonly teamsRemote: string =
    "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}";
  public static readonly outlookLocalTab: string =
    "https://outlook.office.com/host/${localTeamsAppInternalId}?${account-hint}";
  public static readonly outlookRemoteTab: string =
    "https://outlook.office.com/host/${teamsAppInternalId}?${account-hint}";
  public static readonly outlookLocalBot: string =
    "https://outlook.office.com/mail?${account-hint}";
  public static readonly outlookRemoteBot: string =
    "https://outlook.office.com/mail?${account-hint}";
  public static readonly officeLocalTab: string =
    "https://www.office.com/m365apps/${localTeamsAppInternalId}?auth=2&${account-hint}";
  public static readonly officeRemoteTab: string =
    "https://www.office.com/m365apps/${teamsAppInternalId}?auth=2&${account-hint}";
}
