// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import * as chai from "chai";

import MockSharepointTokenProvider from "../../src/commonlib/sharepointLoginUserPassword";
import { SharepointTokenProvider } from "@microsoft/teamsfx-api";

export class SharepointValidator {
  public static provider: SharepointTokenProvider;

  public static init(provider?: SharepointTokenProvider) {
    SharepointValidator.provider = provider || MockSharepointTokenProvider;
  }

  public static async validateDeploy(appId: string) {
      const token = await this.provider.getAccessToken();
      chai.assert.isNotEmpty(token);

      const requester = this.createRequesterWithToken(token!);
      const response = await requester.get(
        `/_api/web/tenantappcatalog/AvailableApps/GetById('${appId}')`
      );
      chai.assert.isTrue(response.data.Deployed);
  }

  public static async deleteApp(appId: string) {
    const token = await this.provider.getAccessToken();
    chai.assert.isNotEmpty(token);

    const requester = this.createRequesterWithToken(token!);
    await requester.post(
      `/_api/web/tenantappcatalog/AvailableApps/GetById('${appId}')/Remove`
    );
  }

  private static createRequesterWithToken(sharepointToken: string): AxiosInstance {
    const instance = axios.create({
      baseURL: "https://teamscloudtest.sharepoint.com/sites/zihch-sp",
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${sharepointToken}`;
    return instance;
  }
}
