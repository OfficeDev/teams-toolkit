// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios from "axios";
import { JwtPayload } from "jwt-decode";

/**
 * Get SSO Token from a specific AAD app client id.
 */
export async function getSSOToken(): Promise<[string, number]> {
  const env = (window as any).__env__;
  const details = {
    username: env.SDK_INTEGRATION_TEST_ACCOUNT_NAME,
    password: env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD,
    client_id: env.SDK_INTEGRATION_TEST_TEAMS_AAD_CLIENT_ID,
    scope: env.SDK_INTEGRATION_TEST_TEAMS_ACCESS_AS_USER_SCOPE,
    grant_type: "password"
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
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );
  const token = (response.data as any)["access_token"];
  const expiresTime = (response.data as any)["expires_in"];
  return [token, expiresTime];
}

export interface AADJwtPayLoad extends JwtPayload {
  appid?: string;
  idtyp?: string;
  scp?: string;
  upn?: string;
}
