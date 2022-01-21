// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessageConnection } from "vscode-jsonrpc";
import {
  AppStudioTokenProvider,
  AzureAccountProvider,
  GraphTokenProvider,
  SharepointTokenProvider,
  TokenProvider,
} from "@microsoft/teamsfx-api";

import ServerAppStudioTokenProvider from "./token/appStudio";
import ServerAzureAccountProvider from "./token/azure";
import ServerGraphTokenProvider from "./token/graph";
import { ServerSharepointTokenProvider } from "./token/sharepoint";

export default class ServerTokenProvider implements TokenProvider {
  connection: MessageConnection;
  azureAccountProvider: AzureAccountProvider;
  graphTokenProvider: GraphTokenProvider;
  appStudioToken: AppStudioTokenProvider;
  sharepointTokenProvider: SharepointTokenProvider;
  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.azureAccountProvider = new ServerAzureAccountProvider(connection);
    this.graphTokenProvider = new ServerGraphTokenProvider(connection);
    this.appStudioToken = new ServerAppStudioTokenProvider(connection);
    this.sharepointTokenProvider = new ServerSharepointTokenProvider(connection);
  }
}
