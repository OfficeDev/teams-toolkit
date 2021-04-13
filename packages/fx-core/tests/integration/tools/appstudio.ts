// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { AppStudioTokenProvider } from "fx-api";
import * as azureConfig from "../conf/azure.json";

require("dotenv").config();

const user = process.env.TEST_USER_NAME ?? "";
const password = process.env.TEST_USER_PASSWORD ?? "";

export class MockAppStudioTokenProvider implements AppStudioTokenProvider {
  private static instance: MockAppStudioTokenProvider;

  private static accessToken: string | undefined;

  private constructor() {}

  public static getInstance(): MockAppStudioTokenProvider {
    if (!MockAppStudioTokenProvider.instance) {
      MockAppStudioTokenProvider.instance = new MockAppStudioTokenProvider();
    }
    return MockAppStudioTokenProvider.instance;
  }

  /**
   * Get team access token
   */
  public async getAccessToken(showDialog = true): Promise<string | undefined> {
    var axios = require("axios");

    var qs = require("qs");

    var data = qs.stringify({
      client_id: azureConfig.client_id,
      scope: "https://dev.teams.microsoft.com/AppDefinitions.ReadWrite",
      username: user,
      password: password,
      grant_type: "password",
    });

    var config = {
      method: "post",
      url: `https://login.microsoftonline.com/${azureConfig.tenant.id}/oauth2/v2.0/token`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie:
          "fpc=AmzaQu9yHbpLtMD2LmHazdRCGxwGAQAAAIW47NcOAAAA; x-ms-gateway-slice=estsfd; stsservicecookie=estsfd",
      },
      data: data,
    };

    await axios(config)
      .then((r) => {
        MockAppStudioTokenProvider.accessToken = r.data.access_token;
      })
      .catch((e) => {
        console.log(e);
      });

    return MockAppStudioTokenProvider.accessToken;
  }

  public async getJsonObject(
    showDialog?: boolean
  ): Promise<Record<string, unknown> | undefined> {
    const token = await this.getAccessToken(showDialog);

    if (token) {
      var array = token.split(".");
      const buff = Buffer.from(array[1], "base64");
      console.log(buff.toString());
      const result = JSON.parse(buff.toString("utf-8"));
      console.log(result);
      return result;
    } else {
      return new Promise((resolve) => {
        resolve(undefined);
      });
    }
  }

  public async signout(): Promise<boolean> {
    return true;
  }

  public async setStatusChangeCallback(
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    return true;
  }
}
