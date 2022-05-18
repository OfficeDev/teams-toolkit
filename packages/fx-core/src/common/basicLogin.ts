// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { FxError, LoginStatus, ok, Result, TokenRequest } from "@microsoft/teamsfx-api";

export abstract class BasicLogin {
  statusChangeMap = new Map();

  async setStatusChangeMap(
    name: string,
    tokenRequest: TokenRequest,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall = true
  ): Promise<Result<boolean, FxError>> {
    this.statusChangeMap.set(name, statusChange);
    if (immediateCall) {
      const loginStatusRes = await this.getStatus(tokenRequest);
      if (loginStatusRes.isOk()) {
        statusChange(
          loginStatusRes.value.status,
          loginStatusRes.value.token,
          loginStatusRes.value.accountInfo
        );
      }
    }
    return ok(true);
  }

  async removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>> {
    this.statusChangeMap.delete(name);
    return ok(true);
  }

  abstract getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>>;

  async notifyStatus(tokenRequest: TokenRequest): Promise<void> {
    const loginStatusRes = await this.getStatus(tokenRequest);
    if (loginStatusRes.isOk()) {
      for (const entry of this.statusChangeMap.entries()) {
        entry[1](
          loginStatusRes.value.status,
          loginStatusRes.value.token,
          loginStatusRes.value.accountInfo
        );
      }
    }
  }
}
