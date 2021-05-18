// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "mocha";
import { AzureAccountProvider, GraphTokenProvider, SubscriptionInfo } from "../src/utils/login";
import { assert } from "chai";
import { TokenCredential } from "@azure/core-auth";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

class TestAzureAccountProvider implements AzureAccountProvider {
  getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
    throw new Error("getAccountCredentialAsync Method not implemented.");
  }
  getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
    throw new Error("getIdentityCredentialAsync Method not implemented.");
  }
  getAccountCredential(): TokenCredentialsBase {
    throw new Error("getAccountCredential Method not implemented.");
  }
  getIdentityCredential(): TokenCredential {
    throw new Error("getIdentityCredential Method not implemented.");
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback({}: (
    status: string,
    token?: string,
    accountInfo?: Record<string, unknown>
  ) => Promise<void>): Promise<boolean> {
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
}

class GraphProvider implements GraphTokenProvider {
  getAccessToken(): Promise<string | undefined> {
    const result = new Promise<string>(function (resovle, {}) {
      resovle("success");
    });
    return result;
  }
  getJsonObject(): Promise<Record<string, unknown> | undefined> {
    const result = new Promise<Record<string, unknown>>(function (resovle, {}) {
      resovle({});
    });
    return result;
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback({}: (
    status: string,
    token?: string,
    accountInfo?: Record<string, unknown>
  ) => Promise<void>): Promise<boolean> {
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
}

class GraphProvider2 implements GraphTokenProvider {
  getAccessToken(): Promise<string | undefined> {
    const result = new Promise<string | undefined>(function (resovle, {}) {
      resovle(undefined);
    });
    return result;
  }
  getJsonObject(): Promise<Record<string, unknown> | undefined> {
    const result = new Promise<undefined>(function (resovle, {}) {
      resovle(undefined);
    });
    return result;
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback({}: (
    status: string,
    token?: string,
    accountInfo?: Record<string, unknown>
  ) => Promise<void>): Promise<boolean> {
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
}

describe("azureLogin", function () {
  describe("withAzureAccountProvider", function () {
    it("plugin context happy path", () => {
      const azure = new TestAzureAccountProvider();
      try {
        azure.getAccountCredential();
      } catch (error) {
        assert.equal(error.message, "getAccountCredential Method not implemented.");
      }
      try {
        azure.getIdentityCredential();
      } catch (error) {
        assert.equal(error.message, "getIdentityCredential Method not implemented.");
      }
    });
  });
});

describe("graphLogin", function () {
  describe("withGraphProvider", function () {
    it("happy path", async () => {
      const graph = new GraphProvider();
      assert.exists(await graph.getAccessToken());
      assert.exists(await graph.getJsonObject());
    }),
      it("return undefined path", async () => {
        const graph2 = new GraphProvider2();
        assert.notExists(await graph2.getAccessToken());
        assert.notExists(await graph2.getJsonObject());
      });
  });
});
