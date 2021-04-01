// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export interface IApimServiceResource {
    serviceName: string;
    resourceGroupName: string;
}

export interface IAadServiceResource {
    clientId: string;
    objectId: string;
    clientSecretId: string;
    clientSecret?: string;
}
