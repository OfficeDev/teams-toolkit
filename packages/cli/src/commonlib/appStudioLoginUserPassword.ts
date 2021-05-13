// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import axios, { AxiosRequestConfig } from "axios";
import dotenv from "dotenv";
import qs from "querystring";

import { AppStudioTokenProvider } from "@microsoft/teamsfx-api";

import * as cfg from "./common/userPasswordConfig";

dotenv.config();

const user = cfg.user;
const password = cfg.password;

type LoginStatus = {
    status: string;
    token?: string;
    accountInfo?: Record<string, unknown>;
};

export class AppStudioTokenProviderUserPassword implements AppStudioTokenProvider {
    private static instance: AppStudioTokenProviderUserPassword;

    private static accessToken: string | undefined;

    public static getInstance(): AppStudioTokenProviderUserPassword {
        if (!AppStudioTokenProviderUserPassword.instance) {
            AppStudioTokenProviderUserPassword.instance = new AppStudioTokenProviderUserPassword();
        }
        return AppStudioTokenProviderUserPassword.instance;
    }

    /**
     * Get team access token
     */
    async getAccessToken(showDialog = true): Promise<string | undefined> {
        const data = qs.stringify({
            client_id: cfg.client_id,
            scope: "https://dev.teams.microsoft.com/AppDefinitions.ReadWrite",
            username: user,
            password: password,
            grant_type: "password",
        });

        const config: AxiosRequestConfig = {
            method: "post",
            url: `https://login.microsoftonline.com/${cfg.tenant.id}/oauth2/v2.0/token`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie:
                    "fpc=AmzaQu9yHbpLtMD2LmHazdRCGxwGAQAAAIW47NcOAAAA; x-ms-gateway-slice=estsfd; stsservicecookie=estsfd",
            },
            data: data,
        };

        await axios(config)
            .then((r: any) => {
                AppStudioTokenProviderUserPassword.accessToken = r.data.access_token;
            })
            .catch((e: any) => {
                console.log(e);
            });

        return AppStudioTokenProviderUserPassword.accessToken;
    }

    async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
        const token = await this.getAccessToken(showDialog);

        if (token) {
            const array = token.split(".");
            const buff = Buffer.from(array[1], "base64");
            return new Promise((resolve) => {
              resolve(JSON.parse(buff.toString("utf-8")));
            });
        } else {
            return new Promise(resolve => {
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

    public async getStatus(): Promise<LoginStatus> {
        return Promise.resolve(
            {
                status: "SignedIn"
            }
        );
    }

    setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    removeStatusChangeMap(name: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}

export default AppStudioTokenProviderUserPassword.getInstance();
