// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios from "axios";
import { JwtPayload } from "jwt-decode";

const env = (window as any).__env__;

export function extractIntegrationEnvVariables() {
  if (!env.SDK_INTEGRATION_TEST_ACCOUNT) {
    throw new Error("Please set env SDK_INTEGRATION_TEST_ACCOUNT");
  }
  const accountData = env.SDK_INTEGRATION_TEST_ACCOUNT.split(";");
  if (accountData.length === 2) {
    env.SDK_INTEGRATION_TEST_ACCOUNT_NAME = accountData[0];
    env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD = accountData[1];
  }
  if (!env.SDK_INTEGRATION_TEST_AAD) {
    throw new Error("Please set env SDK_INTEGRATION_TEST_AAD");
  }
  const aadData = env.SDK_INTEGRATION_TEST_AAD.split(";");
  if (aadData.length === 6) {
    env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST = aadData[0];
    env.SDK_INTEGRATION_TEST_AAD_TENANT_ID = aadData[1];
    env.SDK_INTEGRATION_TEST_USER_OBJECT_ID = aadData[2];
    env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID = aadData[3];
    env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET = aadData[4];
    env.SDK_INTEGRATION_TEST_M365_AAD_CERTIFICATE_CONTENT = aadData[5];
  }
}

/**
 * Get SSO Token from a specific AAD app client id.
 */
export async function getSSOToken(): Promise<SSOToken> {
  const env = (window as any).__env__;
  const details = {
    username: env.SDK_INTEGRATION_TEST_ACCOUNT_NAME,
    password: env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD,
    client_id: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
    scope: `api://localhost:53000/${env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID}/access_as_user`,
    grant_type: "password",
  };
  const formBody = [];
  for (const [key, value] of Object.entries(details)) {
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    formBody.push(encodedKey + "=" + encodedValue);
  }
  const body = formBody.join("&");
  const response = await axios
    .post(
      `https://login.microsoftonline.com/${env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}/oauth2/v2.0/token`,
      body,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )
    .catch((e) => {
      console.log(e);
      throw e;
    });
  const SSOToken = {
    token: (response.data as any)["access_token"],
    expire_time: (response.data as any)["expires_in"],
  };
  return SSOToken;
}

export interface AADJwtPayLoad extends JwtPayload {
  appid?: string;
  idtyp?: string;
  scp?: string;
  upn?: string;
}

export interface SSOToken {
  token: string;
  expire_time: number;
}

/**
 * Get Graph Token. Scope: User.Read
 */
export async function getGraphToken(
  ssoToken: SSOToken,
  scopes: string | string[]
): Promise<string> {
  let scopesStr = "";
  if (scopes) {
    scopesStr = typeof scopes === "string" ? scopes : scopes.join(" ");
    if (scopesStr === "") {
      scopesStr = "https://graph.microsoft.com/.default";
    }
  }
  const details = {
    client_id: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
    client_secret: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET,
    scope: scopesStr!.toLowerCase(),
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    requested_token_use: "on_behalf_of",
    assertion: ssoToken.token!,
  };
  const formBody = [];
  for (const [key, value] of Object.entries(details)) {
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    formBody.push(encodedKey + "=" + encodedValue);
  }
  const body = formBody.join("&");
  const response = await axios.post(
    `https://login.microsoftonline.com/${env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}/oauth2/v2.0/token`,
    body,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return response.data.access_token as string;
}
