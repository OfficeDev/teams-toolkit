// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export enum OperationStatus {
    Started = "started",
    Failed = "failed",
    Succeeded = "succeeded",
}

export interface IName {
    shortName: string;
    displayName: string;
}

export class AzureResource {
    static ResourceGroup: IName = {
        shortName: "resource-group",
        displayName: "Resource Group",
    };

    static APIM: IName = {
        shortName: "apim",
        displayName: "API Management Service",
    };

    static Product: IName = {
        shortName: "apim-product",
        displayName: "API Management product",
    };

    static OAuthServer: IName = {
        shortName: "apim-oauth-server",
        displayName: "API Management OAuth server",
    };

    static VersionSet: IName = {
        shortName: "apim-version-set",
        displayName: "API Management version set",
    };

    static API: IName = {
        shortName: "apim-api",
        displayName: "API Management API",
    };

    static ProductAPI: IName = {
        shortName: "apim-product-api",
        displayName: "API Management product and API relationship",
    };

    static Aad: IName = {
        shortName: "aad",
        displayName: "Azure Active Directory",
    };

    static AadSecret: IName = {
        shortName: "aad-secret",
        displayName: "Azure Active Directory client secret",
    };

    static ServicePrincipal: IName = {
        shortName: "service-principal",
        displayName: "Service Principal",
    };
}

export class Operation {
    static Create: IName = {
        shortName: "create",
        displayName: "create",
    };

    static Update: IName = {
        shortName: "update",
        displayName: "update",
    };

    static Get: IName = {
        shortName: "get",
        displayName: "get",
    };

    static List: IName = {
        shortName: "list",
        displayName: "list",
    };

    static ListNextPage: IName = {
        shortName: "list-next",
        displayName: "list (pagination)",
    };

    static Import: IName = {
        shortName: "import",
        displayName: "import",
    };
}
