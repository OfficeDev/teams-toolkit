// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  PublicClientApplication,
  LogLevel,
  DeviceCodeRequest,
} from "@azure/msal-node";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";

const config = {
  auth: {
    clientId: "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0",
    authority: "https://login.microsoftonline.com/common",
  },
  system: {
    loggerOptions: {
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    },
  },
};

const request: DeviceCodeRequest = {
  scopes: ["https://dev.teams.microsoft.com/AppDefinitions.ReadWrite"],
  deviceCodeCallback: (response) => {
    console.log(response);
  },
};

export async function getAppStudioToken(): Promise<string | undefined> {
  const pca = new PublicClientApplication(config);
  const res = await pca.acquireTokenByDeviceCode(request);
  if (!res) {
    return undefined;
  } else {
    return res.accessToken;
  }
}

export async function getGraphToken(): Promise<string | undefined> {
  const credential = await msRestNodeAuth.interactiveLogin({
    tokenAudience: "https://graph.microsoft.com/",
  });
  const token = await credential.getToken();
  console.log(token);
  return token.accessToken;
}
