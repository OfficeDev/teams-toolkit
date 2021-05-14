// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import dotenv from "dotenv";
import * as msal from "@azure/msal-node";

import { GraphTokenProvider } from "@microsoft/teamsfx-api";

import * as cfg from "./common/userPasswordConfig";

dotenv.config();

const user = cfg.user;
const password = cfg.password;

const msalConfig = {
    auth: {
        clientId: cfg.client_id,
        authority: `https://login.microsoftonline.com/${cfg.tenant.id}`,
    },
};

const scopes = ["https://graph.microsoft.com/.default"];

export class GraphTokenProviderUserPassword implements GraphTokenProvider {
    private static instance: GraphTokenProviderUserPassword;

    private static accessToken: string | undefined;

    /**
     * Gets instance
     * @returns instance
     */
    public static getInstance(): GraphTokenProviderUserPassword {
        if (!GraphTokenProviderUserPassword.instance) {
            GraphTokenProviderUserPassword.instance = new GraphTokenProviderUserPassword();
        }

        return GraphTokenProviderUserPassword.instance;
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
                GraphTokenProviderUserPassword.accessToken = response!.accessToken;
            })
            .catch((e) => {
                console.log(e);
            });
        return GraphTokenProviderUserPassword.accessToken;
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

    setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    removeStatusChangeMap(name: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}

export default GraphTokenProviderUserPassword.getInstance();
