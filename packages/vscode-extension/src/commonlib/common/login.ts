// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

export abstract class login {
  statusChangeMap = new Map();

  async setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall = true
  ): Promise<boolean> {
    this.statusChangeMap.set(name, statusChange);
    if (immediateCall) {
      const loginStatus: LoginStatus = await this.getStatus();
      statusChange(loginStatus.status, loginStatus.token, loginStatus.accountInfo);
    }
    return true;
  }

  async removeStatusChangeMap(name: string): Promise<boolean> {
    this.statusChangeMap.delete(name);
    return true;
  }

  abstract getStatus(): Promise<LoginStatus>;

  async notifyStatus(): Promise<void> {
    const loginStatus: LoginStatus = await this.getStatus();
    for (const entry of this.statusChangeMap.entries()) {
      entry[1](loginStatus.status, loginStatus.token, loginStatus.accountInfo);
    }
  }
}

export type LoginStatus = {
  status: string;
  token?: string;
  accountInfo?: Record<string, unknown>;
};
