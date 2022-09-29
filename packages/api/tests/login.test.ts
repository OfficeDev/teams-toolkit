// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import "mocha";
import {
  AzureAccountProvider,
  BasicLogin,
  LoginStatus,
  M365TokenProvider,
  SubscriptionInfo,
  TokenRequest,
} from "../src/utils/login";
import { assert } from "chai";
import { TokenCredential } from "@azure/core-auth";
import { ok, Result } from "neverthrow";
import { FxError } from "../src/error";

class TestAzureAccountProvider implements AzureAccountProvider {
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

class M365Provider extends BasicLogin implements M365TokenProvider {
  async getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    return ok("fakeToken");
  }
  async getJsonObject(
    tokenRequest: TokenRequest
  ): Promise<Result<Record<string, unknown>, FxError>> {
    return ok({});
  }
  async getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    return ok({ status: "SignedIn" });
  }
}

describe("m365Login", function () {
  describe("withM365Provider", function () {
    it("happy path", async () => {
      const m365 = new M365Provider();
      assert.exists(await m365.getAccessToken({ scopes: ["test"] }));
      assert.exists(await m365.getJsonObject({ scopes: ["test"] }));
      assert.exists(await m365.getStatus({ scopes: ["test"] }));
      assert.exists(
        await m365.setStatusChangeMap(
          "a",
          { scopes: ["test"] },
          async (status, token, accountInfo) => {
            console.log(status);
          },
          true
        )
      );
      assert.exists(await m365.removeStatusChangeMap("a"));
    });
  });
});
