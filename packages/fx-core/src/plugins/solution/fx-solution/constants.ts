/* eslint-disable @typescript-eslint/ban-types */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBot, IComposeExtension, IConfigurableTab, IStaticTab, UserError } from "@microsoft/teamsfx-api";

/**
 * Void is used to construct Result<Void, FxError>.
 * e.g. return ok(Void);
 * It exists because ok(void) does not compile.
 */
export type Void = {};
export const Void = {};

/**
 * The key of global config visible to all resource plugins.
 */
export const GLOBAL_CONFIG = "solution";
// export const SELECTED_PLUGINS = "selectedPlugins";

/**
 * Used to track whether provision succeeded
 * Set to true when provison succeeds, to false when a new resource is added.
 */
export const SOLUTION_PROVISION_SUCCEEDED = "provisionSucceeded";

/**
 * Config key whose value is the content of permissions.json file
 */
export const PERMISSION_REQUEST = "permissionRequest";

/**
 * Config key whose value is either javascript, typescript or csharp.
 */
export const PROGRAMMING_LANGUAGE = "programmingLanguage";

/**
 * Config keys that are useful for generating remote teams app manifest
 */
export const REMOTE_MANIFEST = "manifest.source.json";
export const FRONTEND_ENDPOINT = "endpoint";
export const FRONTEND_DOMAIN = "domain";
export const BOT_ID = "botId";
export const LOCAL_BOT_ID = "localBotId";

export const DEFAULT_PERMISSION_REQUEST = [
    {
        resource: "Microsoft Graph",
        delegated: ["User.Read"],
        application: [],
    },
];

export enum SolutionError {
    InvalidSelectedPluginNames = "InvalidSelectedPluginNames",
    PluginNotFound = "PluginNotFound",
    FailedToCreateAppIdInAppStudio = "FailedToCreateAppIdInAppStudio",
    FailedToUpdateAppIdInAppStudio = "FailedToUpdateAppIdInAppStudio",
    FailedToCreateLocalAppIdInAppStudio = "FailedToCreateLocalAppIdInAppStudio",
    FailedToUpdateLocalAppIdInAppStudio = "FailedToUpdateLocalAppIdInAppStudio",
    AADPluginNotEnabled = "AADPluginNotEnabled",
    MissingPermissionsJson = "MissingPermissionsJson",
    DialogIsNotPresent = "DialogIsNotPresent",
    NoResourcePluginSelected = "NoResourcePluginSelected",
    NoAppStudioToken = "NoAppStudioToken",
    NoTeamsAppTenantId = "NoTeamsAppTenantId",
    FailedToCreateResourceGroup = "FailedToCreateResourceGroup",
    NotLoginToAzure = "NotLoginToAzure",
    AzureAccountExtensionNotInitialized = "AzureAccountExtensionNotInitialized",
    LocalTabEndpointMissing = "LocalTabEndpointMissing",
    LocalTabDomainMissing = "LocalTabDomainMissing",
    LocalClientIDMissing = "LocalDebugClientIDMissing",
    LocalApplicationIdUrisMissing = "LocalApplicationIdUrisMissing",
    LocalClientSecretMissing = "LocalClientSecretMissing",
    CannotUpdatePermissionForSPFx = "CannotUpdatePermissionForSPFx",
    CannotAddResourceForSPFx = "CannotAddResourceForSPFx",
    FailedToParseAzureTenantId = "FailedToParseAzureTenantId",
    FailedToGetAppStudioToken = "FailedToGetAppStudioToken",
    FailedToLoadManifestFile = "FailedToLoadManifestFile",
    CannotRunProvisionInSPFxProject = "CannotRunProvisionInSPFxProject",
    CannotRunThisTaskInSPFxProject = "CannotRunThisTaskInSPFxProject",
    FrontendEndpointAndDomainNotFound = "FrontendEndpointAndDomainNotFound",
    RemoteClientIdNotFound = "RemoteClientIdNotFound",
    AddResourceNotSupport = "AddResourceNotSupport",
    FailedToAddCapability = "FailedToAddCapability",
    NoResourceToDeploy = "NoResourceToDeploy",
    ProvisionInProgress = "ProvisionInProgress",
    DeploymentInProgress = "DeploymentInProgress",
    UnknownSolutionRunningState = "UnknownSolutionRunningState",
    CannotDeployBeforeProvision = "CannotDeployBeforeProvision",
    CannotPublishBeforeProvision = "CannotPublishBeforeProvision",
    NoSubscriptionFound = "NoSubscriptionFound",
    NoSubscriptionSelected = "NoSubscriptionSelected",
    FailedToGetParamForRegisterTeamsAppAndAad = "FailedToGetParamForRegisterTeamsAppAndAad",
    BotInternalError = "BotInternalError",
    InternelError = "InternelError",
    RegisterTeamsAppAndAadError = "RegisterTeamsAppAndAadError",
    UpdateManifestError = "UpdateManifestError",
    GetLocalDebugConfigError = "GetLocalDebugConfigError",
    GetRemoteConfigError = "GetRemoteConfigError",
    UnsupportedPlatform = "UnsupportedPlatform",
    InvalidInput = "InvalidInput"
}

export const LOCAL_DEBUG_TAB_ENDPOINT = "localTabEndpoint";
export const LOCAL_DEBUG_TAB_DOMAIN = "localTabDomain";
export const LOCAL_DEBUG_BOT_DOMAIN = "localBotDomain";
export const BOT_DOMAIN = "validDomain";
export const BOT_SECTION = "bots";
export const COMPOSE_EXTENSIONS_SECTION = "composeExtensions";
export const LOCAL_WEB_APPLICATION_INFO_SOURCE = "local_applicationIdUris";
export const WEB_APPLICATION_INFO_SOURCE = "applicationIdUris";
export const LOCAL_DEBUG_AAD_ID = "local_clientId";
export const REMOTE_AAD_ID = "clientId";
export const LOCAL_APPLICATION_ID_URIS = "local_applicationIdUris";
export const REMOTE_APPLICATION_ID_URIS = "applicationIdUris";
export const LOCAL_CLIENT_SECRET = "local_clientSecret";
export const REMOTE_CLIENT_SECRET = "clientSecret";
// Teams App Id for local debug
export const LOCAL_DEBUG_TEAMS_APP_ID = "localDebugTeamsAppId";
// Teams App Id for remote
export const REMOTE_TEAMS_APP_ID = "remoteTeamsAppId";

export const TEAMS_APP_MANIFEST_TEMPLATE = `{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.7/MicrosoftTeams.schema.json",
    "manifestVersion": "1.7",
    "version": "{version}",
    "id": "{appid}",
    "packageName": "com.microsoft.teams.extension",
    "developer": {
        "name": "Teams App, Inc.",
        "websiteUrl": "{baseUrl}",
        "privacyUrl": "{baseUrl}/index.html#/privacy",
        "termsOfUseUrl": "{baseUrl}/index.html#/termsofuse"
    },
    "icons": {
        "color": "color.png",
        "outline": "outline.png"
    },
    "name": {
        "short": "{appName}",
        "full": "This field is not used"
    },
    "description": {
        "short": "Short description of {appName}.",
        "full": "Full description of {appName}."
    },
    "accentColor": "#FFFFFF",
    "bots": [],
    "composeExtensions": [],
    "configurableTabs": [],
    "staticTabs": [],
    "permissions": [
        "identity",
        "messageTeamMembers"
    ],
    "validDomains": [],
    "webApplicationInfo": {
        "id": "{appClientId}",
        "resource": "{webApplicationInfoResource}"
    }
}`;

export const COMPOSE_EXTENSIONS_TPL: IComposeExtension[] = [
    {
        "botId": "{botId}",
        "commands": [
            {
                "id": "createCard",
                "context": [
                    "compose"
                ],
                "description": "Command to run action to create a Card from Compose Box",
                "title": "Create Card",
                "type": "action",
                "parameters": [
                    {
                        "name": "title",
                        "title": "Card title",
                        "description": "Title for the card",
                        "inputType": "text"
                    },
                    {
                        "name": "subTitle",
                        "title": "Subtitle",
                        "description": "Subtitle for the card",
                        "inputType": "text"
                    },
                    {
                        "name": "text",
                        "title": "Text",
                        "description": "Text for the card",
                        "inputType": "textarea"
                    }
                ]
            },
            {
                "id": "shareMessage",
                "context": [
                    "message"
                ],
                "description": "Test command to run action on message context (message sharing)",
                "title": "Share Message",
                "type": "action",
                "parameters": [
                    {
                        "name": "includeImage",
                        "title": "Include Image",
                        "description": "Include image in Hero Card",
                        "inputType": "toggle"
                    }
                ]
            },
            {
                "id": "searchQuery",
                "context": [
                    "compose",
                    "commandBox"
                ],
                "description": "Test command to run query",
                "title": "Search",
                "type": "query",
                "parameters": [
                    {
                        "name": "searchQuery",
                        "title": "Search Query",
                        "description": "Your search query",
                        "inputType": "text"
                    }
                ]
            }
        ],
        "messageHandlers": [
            {
                "type": "link",
                "value": {
                    "domains": [
                        "*.botframework.com"
                    ]
                }
            }
        ]
    }
];
export const BOTS_TPL: IBot[] = [
    {
        "botId": "{botId}",
        "scopes": [
            "personal",
            "team",
            "groupchat"
        ],
        "supportsFiles": false,
        "isNotificationOnly": false,
        "commandLists": [
            {
                "scopes": [
                    "personal",
                    "team",
                    "groupchat"
                ],
                "commands": [
                    {
                        "title": "intro",
                        "description": "Send introduction card of this Bot"
                    },
                    {
                        "title": "show",
                        "description": "Show user profile by calling Microsoft Graph API with SSO"
                    }
                ]
            }
        ]
    }
];
export const CONFIGURABLE_TABS_TPL: IConfigurableTab[] = [
    {
        "configurationUrl": "{baseUrl}/index.html#/config",
        "canUpdateConfiguration": true,
        "scopes": [
            "team",
            "groupchat"
        ]
    }
];

export const STATIC_TABS_TPL: IStaticTab[] = [
    {
        "entityId": "index",
        "name": "Personal Tab",
        "contentUrl": "{baseUrl}/index.html#/tab",
        "websiteUrl": "{baseUrl}/index.html#/tab",
        "scopes": [
            "personal"
        ]
    }
];


export const DoProvisionFirstError = new UserError("DoProvisionFirst", "DoProvisionFirst", "Solution");
export const CancelError = new UserError("UserCancel", "UserCancel", "Solution");
// This is the max length specified in
// https://developer.microsoft.com/en-us/json-schemas/teams/v1.7/MicrosoftTeams.schema.json
export const TEAMS_APP_SHORT_NAME_MAX_LENGTH = 30;