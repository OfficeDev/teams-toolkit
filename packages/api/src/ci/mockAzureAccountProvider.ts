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
import fs from "fs-extra";
import * as msRestAzure from "ms-rest-azure";
import path from "path";

import { Result, err, ok } from "neverthrow";
import { FxError, returnUserError } from "../error";
import { AzureAccountProvider, SubscriptionInfo } from "../utils/login";
import * as azureConfig from "./conf/azure";
import { ConfigFolderName } from "../constants";

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

    async getSubscriptionList(azureToken: TokenCredentialsBase): Promise<AzureSubscription[]> {
        const client = new SubscriptionClient(azureToken);
        const subscriptions = await listAll(client.subscriptions, client.subscriptions.list());
        const subs: Partial<AzureSubscription>[] = subscriptions.map((sub) => {
            return { displayName: sub.displayName, subscriptionId: sub.subscriptionId };
        });
        const filteredSubs = subs.filter(
            (sub) => sub.displayName !== undefined && sub.subscriptionId !== undefined
        );
        return filteredSubs.map((sub) => {
            return { displayName: sub.displayName!, subscriptionId: sub.subscriptionId! };
        });
    }
  
    public async setSubscriptionId(
      subscriptionId: string,
      root_folder = "./"
    ): Promise<Result<null, FxError>> {
        const token = await this.getAccountCredentialAsync();
        const subscriptions = await this.getSubscriptionList(token!);
    
        if (subscriptions.findIndex((sub) => sub.subscriptionId === subscriptionId) < 0) {
            return err(returnUserError(
                new Error(`Inputed subscription not found in your tenant`),
                "CI",
                "NotFoundSubscriptionId"
            ));
        }
    
        const configPath = path.resolve(root_folder, `.${ConfigFolderName}/env.default.json`);
        if (!(await fs.pathExists(configPath))) {
            return err(returnUserError(
                new Error(`Project type not supported`),
                "CI",
                "NotSupportedProjectType"
            ));
        }
        const configJson = await fs.readJson(configPath);
        configJson["solution"].subscriptionId = subscriptionId;
        await fs.writeFile(configPath, JSON.stringify(configJson, null, 4));
    
        return ok(null);
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
    listSubscriptions(): Promise<SubscriptionInfo[]> {
        throw new Error("Method not implemented.");
    }
    setSubscription(subscriptionId: string): Promise<void> {
        throw new Error("Method not implemented.");
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

export default MockAzureAccountProvider.getInstance();
