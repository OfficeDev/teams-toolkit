// TODO: this is a temporary solution for authorization, it should be deprecated when toolkit ready for auth.
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TokenCredentialsBase, loginWithServicePrincipalSecret } from "@azure/ms-rest-nodeauth";

export interface UserInfo {
  subscriptionId?: string;
  credentials?: TokenCredentialsBase;
  accessToken: string;
}

export async function getAzureAccountAuth(): Promise<UserInfo> {
  const subscriptionId: string = process.env["subscriptionId"] || "";
  const clientId: string = process.env["clientId"] || "";
  const clientSecret: string = process.env["clientSecret"] || "";
  const tenantId: string = process.env["tenantId"] || "";

  const credentials: TokenCredentialsBase = await loginWithServicePrincipalSecret(
    clientId,
    clientSecret,
    tenantId
  );
  const token = await credentials.getToken();
  const accessToken = token.accessToken;

  return {
    subscriptionId: subscriptionId,
    credentials: credentials,
    accessToken: accessToken,
  };
}
