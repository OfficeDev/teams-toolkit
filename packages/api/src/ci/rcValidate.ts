// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import * as chai from "chai";
import { MockAzureAccountProvider } from "./mockAzureAccountProvider";
import { IAadObject } from "./interfaces/IAADDefinition";

const rcPluginName = "fx-resource-runtime-connector";
const solutionPluginName = "solution";
const subscriptionKey = "subscriptionId";
const rgKey = "resourceGroupName";
const baseUrl = (subscriptionId: string, rg: string, name: string) => 
    `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/config/appsettings/list?api-version=2019-08-01`;

export class PropertiesKeys {
    static clientId = "CLIENT_ID";
    static clientSecret = "CLIENT_SECRET";
    static oauthEndpoint = "OAUTH_TOKEN_ENDPOINT";
    static identifierUri = "IDENTIFIER_URI";
}

export interface IRcObject {
    endpoint: string
}

export class RcValidator {
    private static subscriptionId: string;
    private static rg: string;

    public static init(ctx: any, isLocalDebug = false): IRcObject {
        console.log("Start to init validator for Runtime Connector.");

        let rcObject: IRcObject;
        if (!isLocalDebug) {
            rcObject = <IRcObject>ctx[rcPluginName];
        } else {
            rcObject = {
                endpoint: ctx[rcPluginName]["endpoint"]
            } as IRcObject;
        }
        chai.assert.exists(rcObject);

        this.subscriptionId = ctx[solutionPluginName][subscriptionKey];
        chai.assert.exists(this.subscriptionId);

        this.rg = ctx[solutionPluginName][rgKey];
        chai.assert.exists(this.rg);

        console.log("Successfully init validator for Runtime Connector.");
        return rcObject;
    }

    public static async validate(rcObject: IRcObject, aadObject: IAadObject) {
        console.log("Start to validate Runtime Connector.");

        const resourceName: string = rcObject.endpoint.slice(8, -18);
        chai.assert.exists(resourceName);

        const response = await this.getWebappConfigs(this.subscriptionId, this.rg, resourceName);
        chai.assert.exists(response);
        chai.assert.equal(aadObject.clientId, response[PropertiesKeys.clientId]);
        chai.assert.equal(aadObject.clientSecret, response[PropertiesKeys.clientSecret]);
        chai.assert.equal(aadObject.applicationIdUris, response[PropertiesKeys.identifierUri]);
        chai.assert.equal(`${aadObject.oauthAuthority}/oauth2/v2.0/token`, response[PropertiesKeys.oauthEndpoint]);

        console.log("Successfully validate Runtime Connector.");
    }

    private static async getWebappConfigs(subscriptionId: string, rg: string, name: string) {
        const tokenProvider: MockAzureAccountProvider = MockAzureAccountProvider.getInstance();
        const tokenCredential = await tokenProvider.getAccountCredentialAsync();
        const token = (await tokenCredential?.getToken())?.accessToken;
    
        try {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            const rcGetResponse = await axios.post(baseUrl(subscriptionId, rg, name));
            if (!rcGetResponse || !rcGetResponse.data || !rcGetResponse.data.properties) {
                return undefined;
            }
    
            console.log(JSON.stringify(rcGetResponse.data.properties));
            return rcGetResponse.data.properties;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }
}