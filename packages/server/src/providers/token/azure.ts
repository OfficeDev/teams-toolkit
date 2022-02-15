// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";
import { TokenCredential } from "@microsoft/teamsfx-api/node_modules/@azure/core-auth";
import {
  TokenCredentialsBase,
  DeviceTokenCredentials,
} from "@microsoft/teamsfx-api/node_modules/@azure/ms-rest-nodeauth";

import {
  AzureAccountProvider,
  NotImplementedError,
  SubscriptionInfo,
} from "@microsoft/teamsfx-api";

import { RequestTypes } from "../../apis";
import { env } from "../../constant";
import { getResponseWithErrorHandling } from "../../utils";
import { MemoryCache } from "./memoryCache";

export default class ServerAzureAccountProvider implements AzureAccountProvider {
  connection: MessageConnection;
  constructor(connection: MessageConnection) {
    this.connection = connection;
  }
  async getAccountCredentialAsync(
    showDialog?: boolean,
    tenantId?: string
  ): Promise<TokenCredentialsBase | undefined> {
    const promise = this.connection.sendRequest(RequestTypes.azure.getAccountCredential);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      throw result.error;
    }
    const { accessToken, tokenJsonString } = result.value;
    const tokenJson = JSON.parse(tokenJsonString);
    const newTokenJson = (function ConvertTokenToJson(token: string) {
      const array = token!.split(".");
      const buff = Buffer.from(array[1], "base64");
      return JSON.parse(buff.toString("utf8"));
    })(accessToken);
    const tokenExpiresIn = Math.round(new Date().getTime() / 1000) - (newTokenJson.iat as number);

    const memoryCache = new (MemoryCache as any)();
    memoryCache.add(
      [
        {
          tokenType: "Bearer",
          expiresIn: tokenExpiresIn,
          expiresOn: {},
          resource: env.activeDirectoryResourceId,
          accessToken: accessToken,
          userId: (newTokenJson as any).upn ?? (newTokenJson as any).unique_name,
          _clientId: "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0",
          _authority: env.activeDirectoryEndpointUrl + newTokenJson.tid,
        },
      ],
      function () {
        const _ = 1;
      }
    );
    const credential = new DeviceTokenCredentials(
      "7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0",
      tokenJson.tid,
      tokenJson.upn ?? tokenJson.unique_name,
      undefined,
      env,
      memoryCache
    );
    return Promise.resolve(credential);
  }

  async getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential | undefined> {
    return undefined;
  }

  async signout(): Promise<boolean> {
    throw new NotImplementedError("FxServer", `azure/signout`);
  }

  async setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new NotImplementedError("FxServer", `azure/setStatusChangeMap`);
  }

  async removeStatusChangeMap(name: string): Promise<boolean> {
    throw new NotImplementedError("FxServer", `azure/removeStatusChangeMap`);
  }

  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    const promise = this.connection.sendRequest(RequestTypes.azure.getJsonObject);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      throw result.error;
    }
    return JSON.parse(result.value);
  }

  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    const promise = this.connection.sendRequest(RequestTypes.azure.listSubscriptions);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  async setSubscription(subscriptionId: string): Promise<void> {
    const promise = this.connection.sendRequest(RequestTypes.azure.setSubscription, subscriptionId);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      throw result.error;
    }
  }

  getAccountInfo(): Record<string, string> | undefined {
    throw new NotImplementedError("FxServer", `azure/getAccountInfo`);
  }

  async getSelectedSubscription(triggerUI?: boolean): Promise<SubscriptionInfo | undefined> {
    const promise = this.connection.sendRequest(RequestTypes.azure.getSelectedSubscription);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }
}
