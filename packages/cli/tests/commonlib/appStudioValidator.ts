// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import * as chai from "chai";

import MockAppStudioTokenProvider from "../../src/commonlib/appStudioLoginUserPassword";
import { AppStudioTokenProvider } from "@microsoft/teamsfx-api";
import { IAppStudioObject } from "./interfaces/IAADDefinition";

const appStudioPluginName = "fx-resource-appstudio";

export class AppStudioValidator {
  public static provider: AppStudioTokenProvider;

  public static init(ctx: any, provider?: AppStudioTokenProvider) {
    AppStudioValidator.provider = provider || MockAppStudioTokenProvider;

    const appStudioObject: IAppStudioObject | undefined = ctx[appStudioPluginName];
    chai.assert.exists(appStudioObject);

    console.log("Successfully init validator for App Studio.");
    return appStudioObject!;
  }

  public static async validatePublish(appId: string): Promise<void> {
    const token = await this.provider.getAccessToken();
    chai.assert.isNotEmpty(token);

    const requester = this.createRequesterWithToken(token!);
    const response = await requester.get(`/api/publishing/${appId}`);
    if (response.data.error) {
      chai.assert.fail(
        `Publish failed, code: ${response.data.error.code}, message: ${response.data.error.message}`
      );
    }
  }

  public static async validateTeamsAppExist(appStudioObject: IAppStudioObject): Promise<void> {
    chai.assert.exists(appStudioObject.teamsAppId);
    await this.getApp(appStudioObject.teamsAppId!);
  }

  private static createRequesterWithToken(appStudioToken: string): AxiosInstance {
    const instance = axios.create({
      baseURL: "https://dev.teams.microsoft.com",
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${appStudioToken}`;
    return instance;
  }

  private static async getApp(teamsAppId: string): Promise<JSON> {
    const token = await this.provider.getAccessToken();
    chai.assert.isNotEmpty(token);
    const requester = AppStudioValidator.createRequesterWithToken(token!);
    try {
      const response = await requester.get(`/api/appdefinitions/${teamsAppId}`);
      chai.assert.isTrue(response && response.data);
      const app = response.data;
      chai.assert.isTrue(app && app.teamsAppId && app.teamsAppId === teamsAppId);
      return app;
    } catch (e) {
      chai.assert.fail(`Failed to get Teams App, error: ${e}`);
    }
  }
}
