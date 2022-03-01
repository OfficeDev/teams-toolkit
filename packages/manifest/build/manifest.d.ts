export interface IDeveloper {
    /**
     * The display name for the developer.
     */
    name: string;
    /**
     * The Microsoft Partner Network ID that identifies the partner organization building the app. This field is not required, and should only be used if you are already part of the Microsoft Partner Network. More info at https://aka.ms/partner
     */
    mpnId?: string;
    /**
     * The url to the page that provides support information for the app.
     */
    websiteUrl: string;
    /**
     * The url to the page that provides privacy information for the app.
     */
    privacyUrl: string;
    /**
     * The url to the page that provides the terms of use for the app.
     */
    termsOfUseUrl: string;
}
export interface IName {
    short: string;
    /**
     * The full name of the app, used if the full app name exceeds 30 characters.
     */
    full?: string;
}
export interface IIcons {
    color: string;
    outline: string;
}
export interface IConfigurableTab {
    objectId?: string;
    /**
     * The url to use when configuring the tab.
     */
    configurationUrl: string;
    /**
     * A value indicating whether an instance of the tab's configuration can be updated by the user after creation.
     */
    canUpdateConfiguration?: boolean;
    /**
     * Specifies whether the tab offers an experience in the context of a channel in a team, in a 1:1 or group chat, or in an experience scoped to an individual user alone. These options are non-exclusive. Currently, configurable tabs are only supported in the teams and groupchats scopes.
     */
    scopes: ("team" | "groupchat")[];
    /**
     * The set of contextItem scopes that a tab belong to
     */
    context?: ("channelTab" | "privateChatTab" | "meetingChatTab" | "meetingDetailsTab" | "meetingSidePanel" | "meetingStage")[];
    /**
     * A relative file path to a tab preview image for use in SharePoint. Size 1024x768.
     */
    sharePointPreviewImage?: string;
    /**
     * Defines how your tab will be made available in SharePoint.
     */
    supportedSharePointHosts?: ("sharePointFullPage" | "sharePointWebPart")[];
}
export interface IStaticTab {
    objectId?: string;
    /**
     * A unique identifier for the entity which the tab displays.
     */
    entityId: string;
    /**
     * The display name of the tab.
     */
    name?: string;
    /**
     * The url which points to the entity UI to be displayed in the Teams canvas.
     */
    contentUrl?: string;
    /**
     * The url to point at if a user opts to view in a browser.
     */
    websiteUrl?: string;
    /**
     * The url to direct a user's search queries.
     */
    searchUrl?: string;
    /**
     * Specifies whether the tab offers an experience in the context of a channel in a team, or an experience scoped to an individual user alone. These options are non-exclusive. Currently static tabs are only supported in the 'personal' scope.
     */
    scopes: ("team" | "personal")[];
    /**
     * The set of contextItem scopes that a tab belong to
     */
    context?: ("personalTab" | "channelTab")[];
}
export interface ICommand {
    title: string;
    description: string;
}
export interface ICommandList {
    scopes: ("team" | "personal" | "groupchat")[];
    commands: ICommand[];
}
export interface IBot {
    /**
     * The Microsoft App ID specified for the bot in the Bot Framework portal (https://dev.botframework.com/bots)
     */
    botId: string;
    /**
     * This value describes whether or not the bot utilizes a user hint to add the bot to a specific channel.
     */
    needsChannelSelector?: boolean;
    /**
     * A value indicating whether or not the bot is a one-way notification only bot, as opposed to a conversational bot.
     */
    isNotificationOnly?: boolean;
    /**
     * A value indicating whether the bot supports uploading/downloading of files.
     */
    supportsFiles?: boolean;
    /**
     * A value indicating whether the bot supports audio calling.
     */
    supportsCalling?: boolean;
    /**
     * A value indicating whether the bot supports video calling.
     */
    supportsVideo?: boolean;
    /**
     * Specifies whether the bot offers an experience in the context of a channel in a team, in a 1:1 or group chat, or in an experience scoped to an individual user alone. These options are non-exclusive.
     */
    scopes: ("team" | "personal" | "groupchat")[];
    /**
     * The list of commands that the bot supplies, including their usage, description, and the scope for which the commands are valid. A separate command list should be used for each scope.
     */
    commandLists?: ICommandList[];
}
export interface IConnector {
    /**
     * A unique identifier for the connector which matches its ID in the Connectors Developer Portal.
     */
    connectorId: string;
    /**
     * The url to use for configuring the connector using the inline configuration experience.
     */
    configurationUrl?: string;
    /**
     * Specifies whether the connector offers an experience in the context of a channel in a team, or an experience scoped to an individual user alone. Currently, only the team scope is supported.
     */
    scopes: "team"[];
}
export interface IWebApplicationInfo {
    /**
     * AAD application id of the app. This id must be a GUID.
     */
    id: string;
    /**
     * Resource url of app for acquiring auth token for SSO.
     */
    resource?: string;
    applicationPermissions?: string[];
}
export interface IComposeExtension {
    objectId?: string;
    /**
     * The Microsoft App ID specified for the bot powering the compose extension in the Bot Framework portal (https://dev.botframework.com/bots)
     */
    botId: string;
    /**
     * A value indicating whether the configuration of a compose extension can be updated by the user.
     */
    canUpdateConfiguration?: boolean;
    commands: IMessagingExtensionCommand[];
    /**
     * A list of handlers that allow apps to be invoked when certain conditions are met
     */
    messageHandlers?: IComposeExtensionMessageHandler[];
}
export interface IComposeExtensionMessageHandler {
    /**
     * Type of the message handler
     */
    type: "link";
    value: {
        /**
         * A list of domains that the link message handler can register for, and when they are matched the app will be invoked
         */
        domains?: string[];
        [k: string]: unknown;
    };
}
export interface IMessagingExtensionCommand {
    /**
     * Id of the command.
     */
    id: string;
    /**
     * Type of the command
     */
    type?: "query" | "action";
    /**
     * Context where the command would apply
     */
    context?: ("compose" | "commandBox" | "message")[];
    /**
     * Title of the command.
     */
    title: string;
    /**
     * Description of the command.
     */
    description?: string;
    /**
     * A boolean value that indicates if the command should be run once initially with no parameter.
     */
    initialRun?: boolean;
    /**
     * A boolean value that indicates if it should fetch task module dynamically
     */
    fetchTask?: boolean;
    parameters?: IParameter[];
    taskInfo?: ITaskInfo;
}
export interface IParameter {
    /**
     * Name of the parameter.
     */
    name: string;
    /**
     * Type of the parameter
     */
    inputType?: "text" | "textarea" | "number" | "date" | "time" | "toggle" | "choiceset";
    /**
     * Title of the parameter.
     */
    title: string;
    /**
     * Description of the parameter.
     */
    description?: string;
    /**
     * Initial value for the parameter
     */
    value?: string;
    /**
     * The choice options for the parameter
     */
    choices?: {
        /**
         * Title of the choice
         */
        title: string;
        /**
         * Value of the choice
         */
        value: string;
    }[];
}
export interface ITaskInfo {
    /**
     * Initial dialog title
     */
    title?: string;
    /**
     * Dialog width - either a number in pixels or default layout such as 'large', 'medium', or 'small'
     */
    width?: string;
    /**
     * Dialog height - either a number in pixels or default layout such as 'large', 'medium', or 'small'
     */
    height?: string;
    /**
     * Initial webview URL
     */
    url?: string;
}
export interface IActivityType {
    type: string;
    description: string;
    templateText: string;
}
export interface ILocalizationInfo {
    /**
     * The language tag of the strings in this top level manifest file.
     */
    defaultLanguageTag: string;
    additionalLanguages?: {
        languageTag: string;
        /**
         * A relative file path to a the .json file containing the translated strings.
         */
        file: string;
    }[];
}
export declare type AppManifest = Record<string, any>;
/**
 * manifest definition according to : https://developer.microsoft.com/en-us/json-schemas/teams/v1.8/MicrosoftTeams.schema.json
 */
export declare class TeamsAppManifest implements AppManifest {
    $schema?: string;
    /**
     * The version of the schema this manifest is using.
     */
    manifestVersion: string;
    /**
     * The version of the app. Changes to your manifest should cause a version change. This version string must follow the semver standard (http://semver.org).
     */
    version: string;
    /**
     * A unique identifier for this app. This id must be a GUID.
     */
    id: string;
    /**
     * A unique identifier for this app in reverse domain notation. E.g: com.example.myapp
     */
    packageName?: string;
    localizationInfo?: ILocalizationInfo;
    developer: IDeveloper;
    name: IName;
    description: IName;
    icons: IIcons;
    /**
     * A color to use in conjunction with the icon. The value must be a valid HTML color code starting with '#', for example `#4464ee`.
     */
    accentColor: string;
    /**
     * These are tabs users can optionally add to their channels and 1:1 or group chats and require extra configuration before they are added. Configurable tabs are not supported in the personal scope. Currently only one configurable tab per app is supported.
     */
    configurableTabs?: IConfigurableTab[];
    /**
     * A set of tabs that may be 'pinned' by default, without the user adding them manually. Static tabs declared in personal scope are always pinned to the app's personal experience. Static tabs do not currently support the 'teams' scope.
     */
    staticTabs?: IStaticTab[];
    /**
     * The set of bots for this app. Currently only one bot per app is supported.
     */
    bots?: IBot[];
    /**
     * The set of Office365 connectors for this app. Currently only one connector per app is supported.
     */
    connectors?: IConnector[];
    /**
     * The set of compose extensions for this app. Currently only one compose extension per app is supported.
     */
    composeExtensions?: IComposeExtension[];
    /**
     * Specifies the permissions the app requests from users.
     */
    permissions?: ("identity" | "messageTeamMembers")[];
    /**
     * Specify the native features on a user's device that your app may request access to.
     */
    devicePermissions?: ("geolocation" | "media" | "notifications" | "midi" | "openExternal")[];
    /**
     * A list of valid domains from which the tabs expect to load any content. Domain listings can include wildcards, for example `*.example.com`. If your tab configuration or content UI needs to navigate to any other domain besides the one use for tab configuration, that domain must be specified here.
     */
    validDomains?: string[];
    /**
     * Specify your AAD App ID and Graph information to help users seamlessly sign into your AAD app.
     */
    webApplicationInfo?: IWebApplicationInfo;
    /**
     * A value indicating whether or not show loading indicator when app/tab is loading
     */
    showLoadingIndicator?: boolean;
    /**
     * A value indicating whether a personal app is rendered without a tab header-bar
     */
    isFullScreen?: boolean;
    activities?: {
        /**
         * Specify the types of activites that your app can post to a users activity feed
         */
        activityTypes?: IActivityType[];
    };
}
//# sourceMappingURL=manifest.d.ts.map