// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IComposeExtension, IConfigurableTab, IMessagingExtensionCommand, IStaticTab } from "@microsoft/teamsfx-api";

export interface IUserList {
    tenantId: string;
    aadId: string;
    displayName: string;
    userPrincipalName: string;
    isOwner: boolean;
}

export interface ITeamCommand {
    title: string;
    description: string;
}

export interface IPersonalCommand {
    title: string;
    description: string;
}

export interface IGroupChatCommand {
    title: string;
    description: string;
}

export interface ILocalizationInfo {
    defaultLanguageTag?: any;
    languages: any[];
}

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

export interface IAppDefinition {
    teamsAppId?: string;
    tenantId?: string;
    ownerAadId?: string;
    userList?: IUserList[];
    environments?: any[];
    createdAt?: Date;
    updatedAt?: Date;
    appId?: string;
    appName: string;
    appStudioVersion?: string;
    version?: string;
    packageName?: string;
    shortName?: string;
    longName?: string;
    developerName?: string;
    websiteUrl?: string;
    privacyUrl?: string;
    termsOfUseUrl?: string;
    mpnId?: string;
    shortDescription?: string;
    longDescription?: string;
    colorIcon?: string;
    outlineIcon?: string;
    accentColor?: string;
    configurableTabs?: IConfigurableTab[];
    staticTabs?: IStaticTab[];
    bots?: IAppDefinitionBot[];
    connectors?: any[];
    messagingExtensions?: IMessagingExtension[];
    validDomains?: string[];
    appStudioChecklistChecked?: any[];
    webApplicationInfoId?: string;
    webApplicationInfoResource?: string;
    devicePermissions?: any[];
    applicationPermissions?: any[];
    showLoadingIndicator?: boolean;
    isFullScreen?: boolean;
    hasPreviewFeature?: boolean;
    localizationInfo?: ILocalizationInfo;
}

export interface IAppDefinitionBot {
    objectId?: string;
    botId: string;
    needsChannelSelector?: boolean;
    isNotificationOnly: boolean;
    supportsFiles: boolean;
    isAudioCallingBot?: boolean;
    isVideoCallingBot?: boolean;
    scopes: string[];
    teamCommands?: ITeamCommand[];
    personalCommands?: IPersonalCommand[];
    groupChatCommands?: IGroupChatCommand[];
}

export interface IMessagingExtension {
    objectId?: string;
    botId: string;
    canUpdateConfiguration: boolean;
    commands: IMessagingExtensionCommand[];
    messageHandlers: {
        type: "link";
        value: {
            /**
             * A list of domains that the link message handler can register for, and when they are matched the app will be invoked
             */
            domains?: string[];
        }
    }[];
}