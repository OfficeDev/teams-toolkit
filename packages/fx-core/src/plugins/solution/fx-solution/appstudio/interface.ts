// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IComposeExtension, IConfigurableTab, IStaticTab } from "@microsoft/teamsfx-api";

export interface IAADPassword {
  hint?: string;
  id?: string;
  endDate?: string;
  startDate?: string;
  value?: string;
}

export interface IAADApplication {
  id?: string;
  displayName: string;
  passwords?: IAADPassword[];
  objectId?: string;
}

export interface IBotRegistration {
  botId?: string;
  name: string;
  description: string;
  iconUrl: string;
  messagingEndpoint: string;
  callingEndpoint: string;
}

export interface IDeveloper {
  name: string;
  websiteUrl: string;
  privacyUrl: string;
  termsOfUseUrl: string;
}

export interface IIcons {
  color: string;
  outline: string;
}

export interface IName {
  short: string;
  full: string;
}

export interface IDescription {
  short: string;
  full: string;
}

export interface ICommand {
  title: string;
  description: string;
}

export interface ICommandList {
  scopes: ("team" | "personal" | "groupchat")[];
  commands: ICommand[];
}

export interface IAppManifestBot {
  botId: string;
  scopes: ("team" | "personal" | "groupchat")[];
  supportsFiles: boolean;
  isNotificationOnly: boolean;
  commandLists: ICommandList[];
}

export interface IParameter {
  name: string;
  title: string;
  description: string;
  inputType: string;
  choices?: any[];
}

export interface IWebApplicationInfo {
  id: string;
  resource: string;
}

export interface IAppManifest {
  $schema?: string;
  manifestVersion: string;
  version: string;
  id: string;
  packageName: string;
  developer: IDeveloper;
  icons: IIcons;
  name: IName;
  description: IDescription;
  accentColor: string;
  bots: IAppManifestBot[];
  composeExtensions: IComposeExtension[];
  configurableTabs: IConfigurableTab[];
  staticTabs: IStaticTab[];
  permissions: string[];
  validDomains: string[];
  webApplicationInfo: IWebApplicationInfo;
}
