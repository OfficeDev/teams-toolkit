// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";
import { AzureAccountProvider, M365TokenProvider, TokenProvider } from "@microsoft/teamsfx-api";

import ServerAzureAccountProvider from "./token/azure";
import ServerM365TokenProvider from "./token/m365";

export default class ServerTokenProvider implements TokenProvider {
  connection: MessageConnection;
  azureAccountProvider: AzureAccountProvider;
  m365TokenProvider: M365TokenProvider;
  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.azureAccountProvider = new ServerAzureAccountProvider(connection);
    this.m365TokenProvider = new ServerM365TokenProvider(connection);
  }
}
