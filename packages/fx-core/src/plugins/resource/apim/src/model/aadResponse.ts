// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export interface IPasswordCredential {
    displayName?: string;
    hint?: string;
    keyId?: string;
    secretText?: string;
}

export interface IRequiredResourceAccess {
    resourceAppId?: string;
    resourceAccess?: IResourceAccess[];
}

export interface IResourceAccess {
    id?: string;
    type?: string;
}

export interface IImplicitGrantSettings {
    enableIdTokenIssuance?: boolean;
}

export interface IWeb {
    redirectUris?: string[];
    implicitGrantSettings?: IImplicitGrantSettings;
}

export interface IAadInfo {
    id?: string;
    appId?: string;
    displayName?: string;
    identifierUris?: string[];
    passwordCredentials?: IPasswordCredential[];
    requiredResourceAccess?: IRequiredResourceAccess[];
    web?: IWeb;
    api?: IApiApplication;
}

export interface IServicePrincipals {
    value?: IServicePrincipal[];
}

export interface IServicePrincipal {
    id: string;
    appId: string;
}

export interface IApiApplication {
    knownClientApplications?: string[];
    oauth2PermissionScopes?: IOAuth2PermissionScope[];
}

export interface IOAuth2PermissionScope {
    adminConsentDescription?: string,
    adminConsentDisplayName?: string,
    id?: string,
    isEnabled: boolean,
    lang?: string,
    origin?: string,
    type?: string,
    userConsentDescription?: string,
    userConsentDisplayName?: string,
    value?: string,
}