// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import * as chai from "chai";

import MockAppStudioTokenProvider from "./mockAppStudioTokenProvider";
import { AppStudioTokenProvider } from "../utils/login";

export class AppStudioValidator {
    public static provider: AppStudioTokenProvider;

    public static init(provider?: AppStudioTokenProvider) {
        AppStudioValidator.provider = provider || MockAppStudioTokenProvider;
    }

    public static async validatePublish(appId: string): Promise<void> {
        const token = await this.provider.getAccessToken();
        chai.assert.isNotEmpty(token);
        
        const requester = this.createRequesterWithToken(token!);
        const response = await requester.get(`/api/publishing/${appId}`);
        chai.assert.isNotEmpty(response.data.value);
    }

    private static createRequesterWithToken(appStudioToken: string): AxiosInstance {
        const instance = axios.create({
            baseURL: "https://dev.teams.microsoft.com",
        });
        instance.defaults.headers.common["Authorization"] = `Bearer ${appStudioToken}`;
        return instance;
    }
}