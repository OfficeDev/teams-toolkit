// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import * as chai from "chai";
import { MockAzureAccountProvider } from "./mockAzureAccountProvider";

const baseUrlContainer = (
    subscriptionId: string,
    resourceGroupName: string,
    storageName: string,
    containerName: string
) =>
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageName}/blobServices/default/containers/${containerName}?api-version=2021-01-01`;

const baseUrlBlob = (storageName: string, containerName: string, sasToken: string) =>
    `https://${storageName}.blob.core.windows.net/${containerName}?restype=container&comp=list&${sasToken}`;

const baseUrlSasToken = (subscriptionId: string, resourceGroupName: string, storageName: string) =>
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${storageName}/ListAccountSas?api-version=2021-01-01`;


class DependentPluginInfo {
    public static readonly functionPluginName = "fx-resource-function";
    public static readonly apiEndpoint = "functionEndpoint";

    public static readonly solutionPluginName = "solution";
    public static readonly resourceGroupName: string = "resourceGroupName";
    public static readonly subscriptionId: string = "subscriptionId";
    public static readonly resourceNameSuffix: string = "resourceNameSuffix";
    public static readonly location: string = "location";
    public static readonly programmingLanguage: string = "programmingLanguage";

    public static readonly aadPluginName: string = "fx-resource-aad-app-for-teams";
    public static readonly aadClientId: string = "clientId";
    public static readonly aadClientSecret: string = "clientSecret";
    public static readonly oauthHost: string = "oauthHost";
    public static readonly tenantId: string = "tenantId";
    public static readonly applicationIdUris: string = "applicationIdUris";

    public static readonly frontendPluginName: string = "fx-resource-frontend-hosting";
    public static readonly frontendEndpoint: string = "endpoint";
    public static readonly frontendDomain: string = "domain";
}

interface IFrontendObject {
    storageName: string,
    containerName: string,
}

export class FrontendValidator {
    private static subscriptionId: string;
    private static resourceGroupName: string;

    public static init(ctx: any): IFrontendObject {
        console.log("Start to init validator for Frontend.");

        const frontendObject = ctx[
            DependentPluginInfo.frontendPluginName
        ] as IFrontendObject;
        chai.assert.exists(frontendObject);
        frontendObject.containerName = "$web";

        this.subscriptionId = ctx[DependentPluginInfo.solutionPluginName][DependentPluginInfo.subscriptionId];
        chai.assert.exists(this.subscriptionId);

        this.resourceGroupName = ctx[DependentPluginInfo.solutionPluginName][DependentPluginInfo.resourceGroupName];
        chai.assert.exists(this.resourceGroupName);

        console.log("Successfully init validator for Frontend.");
        return frontendObject;
    }

    public static async validateProvision(frontendObject: IFrontendObject) {
        console.log("Start to validate Frontend Provision.");

        const tokenProvider: MockAzureAccountProvider = MockAzureAccountProvider.getInstance();
        const tokenCredential = await tokenProvider.getAccountCredentialAsync();
        const token = (await tokenCredential?.getToken())?.accessToken;
        chai.assert.exists(token);

        console.log("Validating Storage Container.");
        const response = await this.getContainer(this.subscriptionId, this.resourceGroupName, frontendObject, token as string);
        chai.assert.exists(response);

        console.log("Successfully validate Frontend Provision.");
    }

    public static async validateDeploy(frontendObject: IFrontendObject) {
        console.log("Start to validate Frontend Deploy.");

        const tokenProvider: MockAzureAccountProvider = MockAzureAccountProvider.getInstance();
        const tokenCredential = await tokenProvider.getAccountCredentialAsync();
        const token = (await tokenCredential?.getToken())?.accessToken;
        chai.assert.exists(token);

        const sasToken = await this.getSasToken(this.subscriptionId, this.resourceGroupName, frontendObject.storageName, token as string);
        chai.assert.exists(sasToken);

        console.log("Validating Storage blobs.");
        const response = await this.getBlobs(frontendObject.storageName, frontendObject.containerName, sasToken as string);
        chai.assert.exists(response);

        console.log("Successfully validate Frontend Deploy.");
    }

    private static async getContainer(
        subscriptionId: string,
        resourceGroupName: string,
        frontendObject: IFrontendObject,
        token: string,
    ) {
        try {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            const frontendContainerResponse = await axios.get(baseUrlContainer(subscriptionId, resourceGroupName, frontendObject.storageName, frontendObject.containerName));

            return frontendContainerResponse?.data?.name;
        }
        catch (error) {
            console.log(error);
            return undefined;
        }
    }

    private static async getBlobs(storageName: string, containerName: string, sasToken: string) {
        try {
            const frontendBlobResponse = await axios.get(baseUrlBlob(storageName, containerName, sasToken), {
                transformRequest: (data, headers) => {
                    delete headers.common["Authorization"];
                }
            });
            return frontendBlobResponse?.data;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    private static async getSasToken(subscriptionId: string, resourceGroupName: string, storageName: string, token: string) {
        try {
            const expiredDate = new Date();
            expiredDate.setDate(new Date().getDate() + 3);

            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            const sasTokenResponse = await axios.post(baseUrlSasToken(subscriptionId, resourceGroupName, storageName), {
                signedExpiry: expiredDate.toISOString(),
                signedPermission: "rl",
                signedResourceTypes: "sco",
                signedServices: "bf"
            });
            return sasTokenResponse?.data?.accountSasToken;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }
}
