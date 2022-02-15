// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";

import { NotImplementedError, SharepointTokenProvider } from "@microsoft/teamsfx-api";

export class ServerSharepointTokenProvider implements SharepointTokenProvider {
  private readonly connection: MessageConnection;

  constructor(connection: MessageConnection) {
    this.connection = connection;
  }

  async getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    throw new NotImplementedError("FxServer", `sharepoint/getAccessToken`);
  }

  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined> {
    throw new NotImplementedError("FxServer", `sharepoint/getJsonObject`);
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
    throw new NotImplementedError("FxServer", `sharepoint/setStatusChangeMap`);
  }

  async removeStatusChangeMap(name: string): Promise<boolean> {
    throw new NotImplementedError("FxServer", `sharepoint/removeStatusChangeMap`);
  }
}
