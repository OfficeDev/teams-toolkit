// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import dotenv from "dotenv";
import * as msal from "@azure/msal-node";

import * as azureConfig from "./conf/azure.json";
import { GraphTokenProvider } from "../utils/login";

dotenv.config();

const user = process.env.TEST_USER_NAME ?? "";
const password = process.env.TEST_USER_PASSWORD ?? "";

const msalConfig = {
    auth: {
        clientId: azureConfig.client_id,
        authority: `https://login.microsoftonline.com/${azureConfig.tenant.id}`,
    },
};

const scopes = ["https://graph.microsoft.com/.default"];

export class MockGraphTokenProvider implements GraphTokenProvider {
    private static instance: MockGraphTokenProvider;

    private static accessToken: string | undefined;

    /**
     * Gets instance
     * @returns instance
     */
    public static getInstance(): MockGraphTokenProvider {
        if (!MockGraphTokenProvider.instance) {
            MockGraphTokenProvider.instance = new MockGraphTokenProvider();
        }

        return MockGraphTokenProvider.instance;
    }

    async getAccessToken(): Promise<string | undefined> {
        const pca = new msal.PublicClientApplication(msalConfig);

        const usernamePasswordRequest = {
            scopes: scopes,
            username: user,
            password: password,
        };

        await pca
            .acquireTokenByUsernamePassword(usernamePasswordRequest)
            .then((response) => {
                MockGraphTokenProvider.accessToken = response!.accessToken;
            })
            .catch((e) => {
                console.log(e);
            });
        return MockGraphTokenProvider.accessToken;
    }

    async getJsonObject(showDialog = true): Promise<Record<string, unknown> | undefined> {
        const token = await this.getAccessToken();
        if (token) {
            const array = token.split(".");
            const buff = Buffer.from(array[1], "base64");
            return new Promise((resolve) => {
                resolve(JSON.parse(buff.toString("utf-8")));
            });
        } else {
            return new Promise((resolve) => {
                resolve(undefined);
            });
        }
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
}

export default MockGraphTokenProvider.getInstance();
