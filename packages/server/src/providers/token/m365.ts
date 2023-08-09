// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";

import {
  err,
  FxError,
  LoginStatus,
  M365TokenProvider,
  ok,
  Result,
  TokenRequest,
} from "@microsoft/teamsfx-api";

import { RequestTypes } from "../../apis";
import { getResponseWithErrorHandling } from "../../utils";
import { NotImplementedError } from "@microsoft/teamsfx-core";

export default class ServerM365TokenProvider implements M365TokenProvider {
  private readonly connection: MessageConnection;

  constructor(connection: MessageConnection) {
    this.connection = connection;
  }

  async getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    const promise = this.connection.sendRequest(RequestTypes.m365.getAccessToken, tokenRequest);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(result.value);
  }

  async getJsonObject(
    tokenRequest: TokenRequest
  ): Promise<Result<Record<string, unknown>, FxError>> {
    const promise = this.connection.sendRequest(RequestTypes.m365.getJsonObject, tokenRequest);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(JSON.parse(result.value));
  }

  async getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    const promise = this.connection.sendRequest(RequestTypes.m365.getStatus, tokenRequest);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(result.value);
  }

  signout(): Promise<boolean> {
    throw new NotImplementedError("FxServer", `m365/signout`);
  }

  setStatusChangeMap(
    name: string,
    tokenRequest: TokenRequest,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<Result<boolean, FxError>> {
    throw new NotImplementedError("FxServer", `m365/setStatusChangeMap`);
  }

  removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>> {
    throw new NotImplementedError("FxServer", `m365/removeStatusChangeMap`);
  }
}
