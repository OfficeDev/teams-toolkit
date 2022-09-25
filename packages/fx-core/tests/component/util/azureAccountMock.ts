// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, SubscriptionInfo } from "@microsoft/teamsfx-api";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { TokenCredential } from "@azure/core-auth";
import { TokenResponse } from "adal-node";

export class TestAzureAccountProvider implements AzureAccountProvider {
  getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
    throw new Error("getAccountCredentialAsync Method not implemented.");
  }
  getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    throw new Error("getIdentityCredentialAsync Method not implemented.");
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

export class FakeTokenCredentials extends TokenCredentialsBase {
  public async getToken(): Promise<TokenResponse> {
    return {
      tokenType: "Bearer",
      expiresIn: Date.now(),
      expiresOn: new Date(),
      resource: "anything",
      accessToken: "anything",
    };
  }
}
