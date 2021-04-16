// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import * as chai from "chai";
import { MockAzureAccountProvider } from "./mockAzureAccountProvider";
import { IAadObject } from "./interfaces/IAADDefinition";

const simpleAuthPluginName = "fx-resource-simple-auth";
const solutionPluginName = "solution";
const subscriptionKey = "subscriptionId";
const rgKey = "resourceGroupName";
const baseUrl = (subscriptionId: string, rg: string, name: string) => 
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/config/appsettings/list?api-version=2019-08-01`;

export class PropertiesKeys {
    static clientId = "CLIENT_ID";
    static clientSecret = "CLIENT_SECRET";
    static oauthAuthority = "OAUTH_AUTHORITY";
    static identifierUri = "IDENTIFIER_URI";
    static aadMetadataAddreass = "AAD_METADATA_ADDRESS";
}

export interface ISimpleAuthObject {
    endpoint: string
}

export class SimpleAuthValidator {
    private static subscriptionId: string;
    private static rg: string;

    public static init(ctx: any, isLocalDebug = false): ISimpleAuthObject {
        console.log("Start to init validator for Simple Auth.");

        let simpleAuthObject: ISimpleAuthObject;
        if (!isLocalDebug) {
            simpleAuthObject = <ISimpleAuthObject>ctx[simpleAuthPluginName];
        } else {
            simpleAuthObject = {
                endpoint: ctx[simpleAuthPluginName]["endpoint"]
            } as ISimpleAuthObject;
        }
        chai.assert.exists(simpleAuthObject);

        this.subscriptionId = ctx[solutionPluginName][subscriptionKey];
        chai.assert.exists(this.subscriptionId);

        this.rg = ctx[solutionPluginName][rgKey];
        chai.assert.exists(this.rg);

        console.log("Successfully init validator for Simple Auth.");
        return simpleAuthObject;
    }

    public static async validate(simpleAuthObject: ISimpleAuthObject, aadObject: IAadObject) {
        console.log("Start to validate Simple Auth.");

        const resourceName: string = simpleAuthObject.endpoint.slice(8, -18);
        chai.assert.exists(resourceName);

        const response = await this.getWebappConfigs(this.subscriptionId, this.rg, resourceName);
        chai.assert.exists(response);
        chai.assert.equal(aadObject.clientId, response[PropertiesKeys.clientId]);
        // chai.assert.equal(aadObject.clientSecret, response[PropertiesKeys.clientSecret]);
        chai.assert.equal(aadObject.applicationIdUris, response[PropertiesKeys.identifierUri]);
        chai.assert.equal(aadObject.oauthAuthority, response[PropertiesKeys.oauthAuthority]);
        chai.assert.equal(`${aadObject.oauthAuthority}/v2.0/.well-known/openid-configuration`, response[PropertiesKeys.aadMetadataAddreass]);

        console.log("Successfully validate Simple Auth.");
    }

    private static async getWebappConfigs(subscriptionId: string, rg: string, name: string) {
        const tokenProvider: MockAzureAccountProvider = MockAzureAccountProvider.getInstance();
        const tokenCredential = await tokenProvider.getAccountCredentialAsync();
        const token = (await tokenCredential?.getToken())?.accessToken;
    
        try {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            const simpleAuthGetResponse = await axios.post(baseUrl(subscriptionId, rg, name));
            if (!simpleAuthGetResponse || !simpleAuthGetResponse.data || !simpleAuthGetResponse.data.properties) {
                return undefined;
            }
            
            return simpleAuthGetResponse.data.properties;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }
}