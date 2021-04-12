// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as identity from "@azure/identity";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { TokenCredential } from "@azure/core-http";
import * as arm from "azure-arm-resource";
import dotenv from "dotenv";
import * as msRestAzure from "ms-rest-azure";

import { AzureAccountProvider } from "../utils/login";
import * as azureConfig from "./conf/azure.json";

dotenv.config();

const user = process.env.TEST_USER_NAME ?? "";
const password = process.env.TEST_USER_PASSWORD ?? "";

export class MockAzureAccountProvider implements AzureAccountProvider {
    static tokenCredentialsBase: TokenCredentialsBase;

    static tokenCredential: TokenCredential;

    private client?: arm.ResourceManagementClient;

    private static instance: MockAzureAccountProvider;

    /**
     * Gets instance
     * @returns instance
     */
    public static getInstance(): MockAzureAccountProvider {
        if (!MockAzureAccountProvider.instance) {
            MockAzureAccountProvider.instance = new MockAzureAccountProvider();
        }

        return MockAzureAccountProvider.instance;
    }

    /**
     * Get ms-rest-* [credential](https://github.com/Azure/ms-rest-nodeauth/blob/master/lib/credentials/tokenCredentialsBase.ts)
     */
    getAccountCredential(): TokenCredentialsBase | undefined {
        return MockAzureAccountProvider.tokenCredentialsBase;
    }

    /**
     * Get identity [crendential](https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts)
     */
    getIdentityCredential(): TokenCredential | undefined {
        return MockAzureAccountProvider.tokenCredential;
    }

    async getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
        if (MockAzureAccountProvider.tokenCredentialsBase == undefined) {
            const authres = await msRestNodeAuth.loginWithUsernamePassword(user, password);
            MockAzureAccountProvider.tokenCredentialsBase = authres;
        }

        return new Promise((resolve) => {
            resolve(MockAzureAccountProvider.tokenCredentialsBase);
        });
    }

    async getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
        if (MockAzureAccountProvider.tokenCredential == undefined) {
            const identityCredential = new identity.UsernamePasswordCredential(
                azureConfig.tenant.id,
                "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
                user,
                password,
            );
            const credentialChain = new identity.ChainedTokenCredential(identityCredential);
            MockAzureAccountProvider.tokenCredential = credentialChain;
        }

        return new Promise((resolve) => {
            resolve(MockAzureAccountProvider.tokenCredential);
        });
    }

    public async signout(): Promise<boolean> {
        return new Promise((resolve) => {
          resolve(true);
        });
    }

    async setStatusChangeCallback(
      statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>
    ): Promise<boolean> {
        return new Promise((resolve) => {
            resolve(true);
        });
    }

    public async deleteResourceGroup(rg: string): Promise<void> {
        if (!this.client) {
            const c = await msRestAzure.loginWithUsernamePassword(user, password);
            this.client = new arm.ResourceManagementClient(c, azureConfig.subscription.id);
        }
        this.client!.resourceGroups.deleteMethod(rg, function(err, result, request, response) {
            if (err) {
                console.log(err);
            } else {
                console.log(result);
            }
        });
    }
}

export default MockAzureAccountProvider.getInstance();
