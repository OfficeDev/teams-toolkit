// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { GraphTokenProvider } from "fx-api";
import { LogLevel, ConfidentialClientApplication } from "@azure/msal-node";

import CLILogProvider from "./log";
import { login, LoginStatus } from "./common/login";

/**
 * help link
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/request.md
 */
const config = {
  auth: {
    clientId: process.env.E2E_CLIENT_ID ?? "",
    authority: "https://login.microsoftonline.com/" + process.env.E2E_TENANT_ID ?? "",
    clientSecret: process.env.E2E_SECRET ?? ""
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel: any, message: any, containsPii: any) {
        CLILogProvider.log(4 - loglevel, message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose
    }
  }
};

const clientCredentialRequest = {
  scopes: ["https://graph.microsoft.com/.default"] // replace with your resource
};

export class GraphLogin extends login implements GraphTokenProvider {
  private static instance: GraphLogin;

  private static accessToken: string | undefined;

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): GraphLogin {
    if (!GraphLogin.instance) {
      GraphLogin.instance = new GraphLogin();
    }

    return GraphLogin.instance;
  }

  async getAccessToken(): Promise<string | undefined> {
    const cca = new ConfidentialClientApplication(config);

    const authenticationResult = await cca.acquireTokenByClientCredential(clientCredentialRequest);

    GraphLogin.accessToken = authenticationResult?.accessToken;
    return new Promise((resolve) => {
      resolve(authenticationResult?.accessToken);
    });
  }

  getJsonObject(): Promise<Record<string, unknown> | undefined> {
    if (GraphLogin.accessToken != undefined) {
      const array = GraphLogin.accessToken?.split(".");
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

  async signout(): Promise<boolean> {
    // GraphLogin.codeFlowInstance.account = undefined;
    // if (GraphLogin.statusChange !== undefined) {
    //   await GraphLogin.statusChange("SignedOut", undefined, undefined);
    // }
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  async setStatusChangeCallback(
    statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>
  ): Promise<boolean> {
    // GraphLogin.statusChange = statusChange;
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  getStatus(): Promise<LoginStatus> {
    throw new Error("Method not implemented.");
  }
}

export default GraphLogin.getInstance();
