// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { SubscriptionClient } from "@azure/arm-subscriptions";
import { TokenCredential } from "@azure/core-http";
import * as identity from "@azure/identity";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as arm from "azure-arm-resource";
import dotenv from "dotenv";
import * as msRestAzure from "ms-rest-azure";

import { returnUserError, AzureAccountProvider, SubscriptionInfo } from "@microsoft/teamsfx-api";

import * as cfg from "./common/userPasswordConfig";

dotenv.config();

const user = cfg.user;
const password = cfg.password;

type LoginStatus = {
    status: string;
    token?: string;
    accountInfo?: Record<string, unknown>;
};

export class AzureAccountProviderUserPassword implements AzureAccountProvider {
    static tokenCredentialsBase: TokenCredentialsBase;

    static tokenCredential: TokenCredential;

    private client?: arm.ResourceManagementClient;

    private static instance: AzureAccountProviderUserPassword;

    /**
     * Gets instance
     * @returns instance
     */
    public static getInstance(): AzureAccountProviderUserPassword {
        if (!AzureAccountProviderUserPassword.instance) {
            AzureAccountProviderUserPassword.instance = new AzureAccountProviderUserPassword();
        }

        return AzureAccountProviderUserPassword.instance;
    }

    /**
     * Get ms-rest-* [credential](https://github.com/Azure/ms-rest-nodeauth/blob/master/lib/credentials/tokenCredentialsBase.ts)
     */
    getAccountCredential(): TokenCredentialsBase | undefined {
        return AzureAccountProviderUserPassword.tokenCredentialsBase;
    }

    /**
     * Get identity [crendential](https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/core/core-auth/src/tokenCredential.ts)
     */
    getIdentityCredential(): TokenCredential | undefined {
        return AzureAccountProviderUserPassword.tokenCredential;
    }

    async getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
        if (AzureAccountProviderUserPassword.tokenCredentialsBase == undefined) {
            const authres = await msRestNodeAuth.loginWithUsernamePassword(
                user,
                password,
                {
                    domain: cfg.tenant.id,
                }
            );
            AzureAccountProviderUserPassword.tokenCredentialsBase = authres;
        }

        return new Promise((resolve) => {
            resolve(AzureAccountProviderUserPassword.tokenCredentialsBase);
        });
    }

    async getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
        if (AzureAccountProviderUserPassword.tokenCredential == undefined) {
            const identityCredential = new identity.UsernamePasswordCredential(
                cfg.tenant.id,
                "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
                user,
                password,
            );
            const credentialChain = new identity.ChainedTokenCredential(identityCredential);
            AzureAccountProviderUserPassword.tokenCredential = credentialChain;
        }

        return new Promise((resolve) => {
            resolve(AzureAccountProviderUserPassword.tokenCredential);
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

    public async getStatus(): Promise<LoginStatus> {
        return Promise.resolve(
            {
                status: "SignedIn"
            }
        );
    }

    public async deleteResourceGroup(rg: string): Promise<void> {
        if (!this.client) {
            const c = await msRestAzure.loginWithUsernamePassword(user, password);
            this.client = new arm.ResourceManagementClient(c, cfg.subscription.id);
        }
        this.client!.resourceGroups.deleteMethod(rg, function(err, result, request, response) {
            if (err) {
                console.log(err);
            } else {
                console.log(result);
            }
        });
    }

    setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    removeStatusChangeMap(name: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
        throw new Error("Method not implemented.");
    }

    async listSubscriptions(): Promise<SubscriptionInfo[]> {
        const credential = await this.getAccountCredentialAsync();
        if (credential) {
            const client = new SubscriptionClient(credential);
            const subscriptions = await listAll(client.subscriptions, client.subscriptions.list());
            const filteredsubs = subscriptions.filter(
                sub => !!sub.displayName && !!sub.subscriptionId
            );
            return filteredsubs.map(sub => {
                /// TODO: cfg.tenant.id may not fit to subscriptionId.
                return { subscriptionName: sub.displayName!, subscriptionId: sub.subscriptionId!, tenantId: cfg.tenant.id };
            });
        }
        return [];
    }
    
    async setSubscription(subscriptionId: string): Promise<void> {
        const list = await this.listSubscriptions();
        for (let i=0;i<list.length;++i) {
            const item = list[i];
            if (item.subscriptionId==subscriptionId) {
                return;
            }
        }
        throw returnUserError(
            new Error(`Inputed subscription not found in your tenant`),
            "CI",
            "NotFoundSubscriptionId"
        );
    }
}
  
interface PartialList<T> extends Array<T> {
    nextLink?: string;
}

// Copied from https://github.com/microsoft/vscode-azure-account/blob/2b3c1a8e81e237580465cc9a1f4da5caa34644a6/sample/src/extension.ts
// to list all subscriptions
async function listAll<T>(
    client: { listNext(nextPageLink: string): Promise<PartialList<T>> },
    first: Promise<PartialList<T>>
): Promise<T[]> {
    const all: T[] = [];
    for (
        let list = await first;
        list.length || list.nextLink;
        list = list.nextLink ? await client.listNext(list.nextLink) : []
    ) {
        all.push(...list);
    }
    return all;
}

export type AzureSubscription = {
    displayName: string;
    subscriptionId: string;
};

export default AzureAccountProviderUserPassword.getInstance();
