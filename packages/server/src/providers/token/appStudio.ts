// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";

import { AppStudioTokenProvider, NotImplementedError } from "@microsoft/teamsfx-api";

import { RequestTypes } from "../../apis";
import { getResponseWithErrorHandling } from "../../utils";

export default class ServerAppStudioTokenProvider implements AppStudioTokenProvider {
  private readonly connection: MessageConnection;

  constructor(connection: MessageConnection) {
    this.connection = connection;
  }

  async getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    const promise = this.connection.sendRequest(RequestTypes.appStudio.getAccessToken);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
  }

  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    const promise = this.connection.sendRequest(RequestTypes.appStudio.getJsonObject);
    const result = await getResponseWithErrorHandling(promise);
    if (result.isErr()) {
      throw result.error;
    }
    return JSON.parse(result.value);
  }

  async signout(): Promise<boolean> {
    throw new NotImplementedError("FxServer", `appStudio/signout`);
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
    throw new NotImplementedError("FxServer", `appStudio/setStatusChangeMap`);
  }

  async removeStatusChangeMap(name: string): Promise<boolean> {
    throw new NotImplementedError("FxServer", `appStudio/removeStatusChangeMap`);
  }
}
