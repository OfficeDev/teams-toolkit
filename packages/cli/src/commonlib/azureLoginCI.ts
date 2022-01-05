// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { TokenCredential } from "@azure/core-http";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as identity from "@azure/identity";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import * as fs from "fs-extra";
import * as path from "path";

import { AzureAccountProvider, ConfigFolderName, SubscriptionInfo } from "@microsoft/teamsfx-api";

import { NotSupportedProjectType, NotFoundSubscriptionId } from "../error";
import { login, LoginStatus } from "./common/login";

import { signedIn, signedOut, subscriptionInfoFile } from "./common/constant";
import { isWorkspaceSupported } from "../utils";
import CLILogProvider from "./log";
import { LogLevel as LLevel } from "@microsoft/teamsfx-api";
import * as os from "os";
import { AzureSpCrypto } from "./cacheAccess";

/**
 * Prepare for service principal login, not fully implemented
 */
export class AzureAccountManager extends login implements AzureAccountProvider {
  static tokenCredentialsBase: TokenCredentialsBase;

  static tokenCredential: TokenCredential;

  private static subscriptionId: string | undefined;

  private static instance: AzureAccountManager;

  private static clientId: string;
  private static secret: string;
  private static tenantId: string;
  private static subscriptionName: string | undefined;
  private static rootPath: string | undefined;

  /**
   * Gets instance
   * @returns instance
   */
  public static getInstance(): AzureAccountManager {
    if (!AzureAccountManager.instance) {
      AzureAccountManager.instance = new AzureAccountManager();
    }

    return AzureAccountManager.instance;
  }

  public async init(clientId: string, secret: string, tenantId: string): Promise<void> {
    AzureAccountManager.clientId = clientId;
    if (secret[0] === "~") {
      const expandPath = path.join(os.homedir(), secret.slice(1));
      if (fs.pathExistsSync(expandPath)) {
        AzureAccountManager.secret = expandPath;
      } else {
        AzureAccountManager.secret = secret;
      }
    } else if (fs.pathExistsSync(secret)) {
      AzureAccountManager.secret = secret;
    } else {
      AzureAccountManager.secret = secret;
    }
    AzureAccountManager.tenantId = tenantId;
    try {
      await this.getAccountCredentialAsync();
      await AzureSpCrypto.saveAzureSP(clientId, AzureAccountManager.secret, tenantId);
    } catch (error) {
      CLILogProvider.necessaryLog(LLevel.Info, JSON.stringify(error));
      throw error;
    }
    return;
  }

  public async load(): Promise<boolean> {
    const data = await AzureSpCrypto.loadAzureSP();
    if (data) {
      AzureAccountManager.clientId = data.clientId;
      AzureAccountManager.secret = data.secret;
      AzureAccountManager.tenantId = data.tenantId;
    }
    return false;
  }

  async getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
    await this.load();
    if (AzureAccountManager.tokenCredentialsBase == undefined) {
      let authres;
      if (await fs.pathExists(AzureAccountManager.secret)) {
        authres = await msRestNodeAuth.loginWithServicePrincipalCertificate(
          AzureAccountManager.clientId,
          AzureAccountManager.secret,
          AzureAccountManager.tenantId
        );
        AzureAccountManager.tokenCredentialsBase = authres;
      } else {
        authres = await msRestNodeAuth.loginWithServicePrincipalSecretWithAuthResponse(
          AzureAccountManager.clientId,
          AzureAccountManager.secret,
          AzureAccountManager.tenantId
        );
        AzureAccountManager.tokenCredentialsBase = authres.credentials;
      }
    }

    return new Promise((resolve) => {
      resolve(AzureAccountManager.tokenCredentialsBase);
    });
  }

  async getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    await this.load();
    if (AzureAccountManager.tokenCredential == undefined) {
      const identityCredential = new identity.ClientSecretCredential(
        AzureAccountManager.tenantId,
        AzureAccountManager.clientId,
        AzureAccountManager.secret
      );
      const credentialChain = new identity.ChainedTokenCredential(identityCredential);
      AzureAccountManager.tokenCredential = credentialChain;
    }

    return new Promise((resolve) => {
      resolve(AzureAccountManager.tokenCredential);
    });
  }

  /**
   * singnout from Azure
   */
  async signout(): Promise<boolean> {
    return new Promise(async (resolve) => {
      await AzureSpCrypto.clearAzureSP();
      resolve(true);
    });
  }

  async getSubscriptionList(azureToken: TokenCredentialsBase): Promise<AzureSubscription[]> {
    await this.load();
    const client = new SubscriptionClient(azureToken);
    const subscriptions = await listAll(client.subscriptions, client.subscriptions.list());
    const subs: Partial<AzureSubscription>[] = subscriptions.map((sub) => {
      return { displayName: sub.displayName, subscriptionId: sub.subscriptionId };
    });
    const filteredSubs = subs.filter(
      (sub) => sub.displayName !== undefined && sub.subscriptionId !== undefined
    );
    return filteredSubs.map((sub) => {
      return { displayName: sub.displayName!, subscriptionId: sub.subscriptionId! };
    });
  }

  async getStatus(): Promise<LoginStatus> {
    await this.load();
    if (
      AzureAccountManager.clientId &&
      AzureAccountManager.secret &&
      AzureAccountManager.tenantId
    ) {
      return {
        status: signedIn,
      };
    }
    return {
      status: signedOut,
    };
  }

  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new Error("Method not implemented.");
  }

  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    const credential = await this.getAccountCredentialAsync();
    if (credential) {
      const client = new SubscriptionClient(credential);
      let answers: SubscriptionInfo[] = [];
      if (AzureAccountManager.tenantId) {
        let credential;
        if (await fs.pathExists(AzureAccountManager.secret)) {
          const authres = await msRestNodeAuth.loginWithServicePrincipalCertificate(
            AzureAccountManager.clientId,
            AzureAccountManager.secret,
            AzureAccountManager.tenantId
          );
          credential = authres;
        } else {
          const authres = await msRestNodeAuth.loginWithServicePrincipalSecretWithAuthResponse(
            AzureAccountManager.clientId,
            AzureAccountManager.secret,
            AzureAccountManager.tenantId
          );
          credential = authres.credentials;
        }
        const client = new SubscriptionClient(credential);
        const subscriptions = await listAll(client.subscriptions, client.subscriptions.list());
        const filteredsubs = subscriptions.filter(
          (sub) => !!sub.displayName && !!sub.subscriptionId
        );
        answers = answers.concat(
          filteredsubs.map((sub) => {
            return {
              subscriptionName: sub.displayName!,
              subscriptionId: sub.subscriptionId!,
              tenantId: AzureAccountManager.tenantId!,
            };
          })
        );
      }
      return answers;
    }
    return [];
  }

  async setSubscription(subscriptionId: string): Promise<void> {
    const list = await this.listSubscriptions();
    for (let i = 0; i < list.length; ++i) {
      const item = list[i];
      if (item.subscriptionId === subscriptionId) {
        await this.saveSubscription({
          subscriptionId: item.subscriptionId,
          subscriptionName: item.subscriptionName,
          tenantId: item.tenantId,
        });
        AzureAccountManager.tenantId = item.tenantId;
        AzureAccountManager.subscriptionId = item.subscriptionId;
        AzureAccountManager.subscriptionName = item.subscriptionName;
        return;
      }
    }
    throw NotFoundSubscriptionId();
  }

  async saveSubscription(subscriptionInfo: SubscriptionInfo): Promise<void> {
    const subscriptionFilePath = await this.getSubscriptionInfoPath();
    if (!subscriptionFilePath) {
      return;
    } else {
      await fs.writeFile(subscriptionFilePath, JSON.stringify(subscriptionInfo, null, 4));
    }
  }

  async getSubscriptionInfoPath(): Promise<string | undefined> {
    if (AzureAccountManager.rootPath) {
      if (isWorkspaceSupported(AzureAccountManager.rootPath)) {
        const subscriptionFile = path.join(
          AzureAccountManager.rootPath,
          `.${ConfigFolderName}`,
          subscriptionInfoFile
        );
        return subscriptionFile;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  getAccountInfo(): Record<string, string> | undefined {
    return {};
  }

  async getSelectedSubscription(): Promise<SubscriptionInfo | undefined> {
    await this.readSubscription();
    if (AzureAccountManager.subscriptionId) {
      const selectedSub: SubscriptionInfo = {
        subscriptionId: AzureAccountManager.subscriptionId,
        tenantId: AzureAccountManager.tenantId!,
        subscriptionName: AzureAccountManager.subscriptionName ?? "",
      };
      return selectedSub;
    } else {
      return undefined;
    }
  }

  public setRootPath(rootPath: string): void {
    AzureAccountManager.rootPath = rootPath;
  }

  async readSubscription(): Promise<SubscriptionInfo | undefined> {
    const subscriptionFIlePath = await this.getSubscriptionInfoPath();
    if (subscriptionFIlePath === undefined) {
      return undefined;
    }
    if (!fs.existsSync(subscriptionFIlePath)) {
      return undefined;
    }
    const content = (await fs.readFile(subscriptionFIlePath)).toString();
    if (content.length == 0) {
      return undefined;
    }
    const subscriptionJson = JSON.parse(content);
    AzureAccountManager.subscriptionId = subscriptionJson.subscriptionId;
    AzureAccountManager.subscriptionName = subscriptionJson.subscriptionName;
    return {
      subscriptionId: subscriptionJson.subscriptionId,
      tenantId: subscriptionJson.tenantId,
      subscriptionName: subscriptionJson.subscriptionName,
    };
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

export default AzureAccountManager.getInstance();
