// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  LoginStatus,
  M365TokenProvider,
  ok,
  Result,
  TokenRequest,
} from "@microsoft/teamsfx-api";

export class MockM365TokenProvider implements M365TokenProvider {
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    return ok("token");
  }

  async getJsonObject(
    tokenRequest: TokenRequest
  ): Promise<Result<Record<string, unknown>, FxError>> {
    return ok({
      tid: this.tenantId,
    });
  }

  async getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    throw new Error("Method not implemented.");
  }

  async setStatusChangeMap(
    name: string,
    tokenRequest: TokenRequest,
    statusChange: (
      status: string,
      token?: string | undefined,
      accountInfo?: Record<string, unknown> | undefined
    ) => Promise<void>,
    immediateCall?: boolean | undefined
  ): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }

  async removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }
}
