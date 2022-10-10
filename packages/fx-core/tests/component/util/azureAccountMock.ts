// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, SubscriptionInfo } from "@microsoft/teamsfx-api";
import { TokenCredential } from "@azure/core-auth";
import { AccessToken, GetTokenOptions } from "@azure/identity";

class MyTokenCredential implements TokenCredential {
  public async getToken(
    scopes: string | string[],
    options?: GetTokenOptions
  ): Promise<AccessToken | null> {
    return {
      token: "a.eyJ1c2VySWQiOiJ0ZXN0QHRlc3QuY29tIn0=.c",
      expiresOnTimestamp: 1234,
    };
  }
}

export class TestAzureAccountProvider implements AzureAccountProvider {
  async getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    return new MyTokenCredential();
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    throw new Error("Method not implemented.");
  }
  listSubscriptions(): Promise<SubscriptionInfo[]> {
    throw new Error("Method not implemented.");
  }
  setSubscription(subscriptionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getAccountInfo(): Record<string, string> {
    throw new Error("Method not implemented.");
  }
  getSelectedSubscription(): Promise<SubscriptionInfo | undefined> {
    throw new Error("Method not implemented.");
  }
}
