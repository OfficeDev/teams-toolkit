// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { SubscriptionClient } from "@azure/arm-subscriptions";
import { TokenCredential } from "@azure/core-http";
import * as identity from "@azure/identity";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import dotenv from "dotenv";

import { returnUserError, AzureAccountProvider, SubscriptionInfo } from "@microsoft/teamsfx-api";

import * as cfg from "./common/userPasswordConfig";

dotenv.config();

const user = cfg.AZURE_ACCOUNT_NAME || "";
const password = cfg.AZURE_ACCOUNT_PASSWORD || "";

type LoginStatus = {
  status: string;
  token?: string;
  accountInfo?: Record<string, unknown>;
};

export class AzureAccountProviderUserPassword implements AzureAccountProvider {
  static tokenCredentialsBase: TokenCredentialsBase;

  static tokenCredential: TokenCredential;

  private static instance: AzureAccountProviderUserPassword;

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): AzureAccountProviderUserPassword {
    if (!AzureAccountProviderUserPassword.instance) {
      AzureAccountProviderUserPassword.instance = new AzureAccountProviderUserPassword();
    }

    return AzureAccountProviderUserPassword.instance;
  }

  async getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
    if (AzureAccountProviderUserPassword.tokenCredentialsBase == undefined) {
      AzureAccountProviderUserPassword.tokenCredentialsBase =
        await msRestNodeAuth.loginWithUsernamePassword(user, password, {
          domain: cfg.AZURE_TENANT_ID,
        });
    }

    return new Promise((resolve) => {
      resolve(AzureAccountProviderUserPassword.tokenCredentialsBase);
    });
  }

  async getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    if (AzureAccountProviderUserPassword.tokenCredential == undefined) {
      const identityCredential = new identity.UsernamePasswordCredential(
        cfg.AZURE_TENANT_ID || "organizations",
        "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
        user,
        password
      );
      const credentialChain = new identity.ChainedTokenCredential(identityCredential);
      AzureAccountProviderUserPassword.tokenCredential = credentialChain;
    }

    return new Promise((resolve) => {
      resolve(AzureAccountProviderUserPassword.tokenCredential);
    });
  }

  public async signout(): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  public async getStatus(): Promise<LoginStatus> {
    return Promise.resolve({
      status: "SignedIn",
    });
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
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error("Method not implemented.");
  }

  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    const credential = await this.getAccountCredentialAsync();
    if (credential) {
      const client = new SubscriptionClient(credential);
      const tenants = await listAll(client.tenants, client.tenants.list());
      let answers: SubscriptionInfo[] = [];
      for (const tenant of tenants) {
        if (tenant.tenantId) {
          const cred = await msRestNodeAuth.loginWithUsernamePassword(user, password, {
            domain: tenant.tenantId,
          });
          const client = new SubscriptionClient(cred);
          const subscriptions = await listAll(client.subscriptions, client.subscriptions.list());
          const filteredsubs = subscriptions.filter(
            (sub) => !!sub.displayName && !!sub.subscriptionId
          );
          answers = answers.concat(
            filteredsubs.map((sub) => {
              return {
                subscriptionName: sub.displayName!,
                subscriptionId: sub.subscriptionId!,
                tenantId: tenant.tenantId!,
              };
            })
          );
        }
      }
      return answers;
    }
    return [];
  }

  async setSubscription(subscriptionId: string): Promise<void> {
    const list = await this.listSubscriptions();
    for (let i = 0; i < list.length; ++i) {
      const item = list[i];
      if (item.subscriptionId == subscriptionId) {
        return;
      }
    }
    throw returnUserError(
      new Error(`Inputed subscription not found in your tenant`),
      "CI",
      "NotFoundSubscriptionId"
    );
  }

  // For now, cli no need to get account information through this method
  getAccountInfo(): Record<string, string> | undefined {
    return {};
  }

  getSelectedSubscription(): Promise<SubscriptionInfo | undefined> {
    const selectedSub: SubscriptionInfo = {
      subscriptionId: "",
      tenantId: "",
      subscriptionName: "",
    };
    if (cfg.AZURE_TENANT_ID) {
      selectedSub.tenantId = cfg.AZURE_TENANT_ID;
    }
    if (cfg.AZURE_SUBSCRIPTION_ID) {
      selectedSub.subscriptionId = cfg.AZURE_SUBSCRIPTION_ID;
    }
    return Promise.resolve(selectedSub);
  }

  async selectSubscription(subscriptionId?: string): Promise<string | undefined> {
    if (subscriptionId) {
      await this.setSubscription(subscriptionId);
      return Promise.resolve(subscriptionId);
    } else {
      return Promise.resolve(undefined);
    }
  }

  public setRootPath(rootPath: string): void {}

  async readSubscription(): Promise<SubscriptionInfo | undefined> {
    return undefined;
  }

  async getSubscriptionInfoFromEnv(): Promise<SubscriptionInfo | undefined> {
    return undefined;
  }
}

interface PartialList<T> extends Array<T> {
  nextLink?: string;
}

// Copied from https://github.com/microsoft/vscode-azure-account/blob/2b3c1a8e81e237580465cc9a1f4da5caa34644a6/sample/src/extension.ts
// to list all subscriptions
async function listAll<T>(
  client: { listNext(nextPageLink: string): Promise<PartialList<T>> },
  first: Promise<PartialList<T>>
): Promise<T[]> {
  const all: T[] = [];
  for (
    let list = await first;
    list.length || list.nextLink;
    list = list.nextLink ? await client.listNext(list.nextLink) : []
  ) {
    all.push(...list);
  }
  return all;
}

export type AzureSubscription = {
  displayName: string;
  subscriptionId: string;
};

export default AzureAccountProviderUserPassword.getInstance();
