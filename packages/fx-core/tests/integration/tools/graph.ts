// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { GraphTokenProvider } from "fx-api";
import * as msal from "@azure/msal-node";
import * as azureConfig from "../conf/azure.json";

require("dotenv").config();

const user = process.env.TEST_USER_NAME ?? "";
const password = process.env.TEST_USER_PASSWORD ?? "";

const msalConfig = {
  auth: {
    clientId: azureConfig.client_id,
    authority: `https://login.microsoftonline.com/${azureConfig.tenant.id}`,
  },
};

const scopes = ["https://graph.microsoft.com/.default"];

export class MockGraphLogin implements GraphTokenProvider {
  private static instance: MockGraphLogin;

  private static accessToken: string | undefined;

  private constructor() {}

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): MockGraphLogin {
    if (!MockGraphLogin.instance) {
      MockGraphLogin.instance = new MockGraphLogin();
    }

    return MockGraphLogin.instance;
  }

  public async getAccessToken(): Promise<string | undefined> {
    const pca = new msal.PublicClientApplication(msalConfig);

    const usernamePasswordRequest = {
      scopes: scopes,
      username: user,
      password: password,
    };

    await pca
      .acquireTokenByUsernamePassword(usernamePasswordRequest)
      .then((response) => {
        MockGraphLogin.accessToken = response!.accessToken;
      })
      .catch((e) => {
        console.log(e);
      });
    return MockGraphLogin.accessToken;
  }

  public async getJsonObject(
    showDialog?: boolean
  ): Promise<Record<string, unknown> | undefined> {
    if (MockGraphLogin.accessToken != undefined) {
      var array = MockGraphLogin.accessToken?.split(".");
      const buff = Buffer.from(array![1], "base64");
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
