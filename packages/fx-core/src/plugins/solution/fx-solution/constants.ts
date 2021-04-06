// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Void is used to construct Result<Void, FxError>.
 * e.g. return ok(Void);
 * It exists because ok(void) does not compile.
 */
export type Void = Record<string, never>;
export const Void = {};

/**
 * The key of global config visible to all resource plugins.
 */
export const GLOBAL_CONFIG = "solution";
export const SELECTED_PLUGINS = "selectedPlugins";

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
 * Config keys that are useful for generating remote teams app manifest
 */
export const FRONTEND_ENDPOINT = "endpoint";
export const FRONTEND_DOMAIN = "domain";
export const AAD_REMOTE_CLIENT_ID = "clientId";
export const BOTS = "bots";
export const COMPOSE_EXTENSIONS = "composeExtensions";

export const DEFAULT_PERMISSION_REQUEST = [
    {
        resource: "Microsoft Graph",
        scopes: ["User.Read"],
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
    CannotUpdatePermissionForSPFx = "CannotUpdatePermissionForSPFx",
    CannotAddResourceForSPFx = "CannotAddResourceForSPFx",
    FailedToParseAzureTenantId = "FailedToParseAzureTenantId",
    FailedToGetAppStudioToken = "FailedToGetAppStudioToken",
    FailedToLoadManifestFile = "FailedToLoadManifestFile",
    CannotRunProvisionInSPFxProject = "CannotRunProvisionInSPFxProject",
    FrontendEndpointAndDomainNotFound = "FrontendEndpointAndDomainNotFound",
    RemoteClientIdNotFound = "RemoteClientIdNotFound",
    AddResourceNotSupport = "AddResourceNotSupport",
    NoResourceToDeploy = "NoResourceToDeploy",
    ProvisionInProgress = "ProvisionInProgress",
    DeploymentInProgress = "DeploymentInProgress",
    UnknownSolutionRunningState = "UnknownSolutionRunningState",
    CannotDeployBeforeProvision = "CannotDeployBeforeProvision",
    NoSubscriptionFound = "NoSubscriptionFound",
    NoSubscriptionSelected = "NoSubscriptionSelected",
    BotInternalError = "BotInternalError",
    InternelError = "InternelError",
}

export const LOCAL_DEBUG_TAB_ENDPOINT = "localTabEndpoint";
export const LOCAL_DEBUG_TAB_DOMAIN = "localTabDomain";
export const LOCAL_DEBUG_AAD_ID = "local_clientId";
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
        "short": "Short description for {appName}.",
        "full": "Full description of {appName}."
    },
    "accentColor": "#FFFFFF",
    "bots": [],
    "composeExtensions": [],
    "configurableTabs": [],
    "staticTabs": [
        {
            "entityId": "index",
            "name": "Personal Tab",
            "contentUrl": "{baseUrl}/index.html#/tab",
            "websiteUrl": "{baseUrl}/index.html#/tab",
            "scopes": [
                "personal"
            ]
        }
    ],
    "permissions": [
        "identity",
        "messageTeamMembers"
    ],
    "validDomains": [],
    "webApplicationInfo": {
        "id": "{appClientId}",
        "resource": "api://{frontEndDomain}/{appClientId}"
    }
}`;
