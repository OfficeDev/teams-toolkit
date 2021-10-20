// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  assembleError,
  AzureAccountProvider,
  Colors,
  CryptoProvider,
  err,
  FxError,
  GraphTokenProvider,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  LogLevel,
  LogProvider,
  MultiSelectConfig,
  MultiSelectResult,
  NotImplementedError,
  ok,
  PermissionRequestProvider,
  Result,
  RunnableTask,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SharepointTokenProvider,
  SingleSelectConfig,
  SingleSelectResult,
  SubscriptionInfo,
  TaskConfig,
  TelemetryReporter,
  TokenProvider,
  Tools,
  TreeProvider,
  UIConfig,
  UserInteraction,
} from "@microsoft/teamsfx-api";
import { createMessageConnection } from "vscode-jsonrpc/node";
import WebSocket from "ws";
import { Namespaces } from "./namespace";
import { sendRequest } from "./utils";

const ws = new WebSocket("ws://localhost:7920");
ws.on("message", (ms) => {
  console.log(ms.toString());
});
const wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });
const connection = createMessageConnection(wsStream, wsStream);
connection.listen();

test();

async function test() {
  connection.onRequest(
    `${Namespaces.UserInteraction}/selectOption`,
    async (config: SingleSelectConfig) => {
      if (config.name === "scratch") {
        return { type: "success", result: config.options[0] };
      } else if (config.name === "host-type") {
        return { type: "success", result: "Azure" };
      } else {
        if (config.default) {
          return { type: "success", result: config.default };
        }
        throw new NotImplementedError(
          "MockWSClient",
          `${Namespaces.UserInteraction}/selectOption:${JSON.stringify(config)}`
        );
      }
    }
  );
  connection.onRequest(
    `${Namespaces.UserInteraction}/selectOptions`,
    async (config: SingleSelectConfig) => {
      if (config.name === "capabilities") {
        return { type: "success", result: ["Tab"] };
      } else if (config.name === "azure-resources") {
        return { type: "success", result: [] };
      } else {
        throw new NotImplementedError(
          "MockWSClient",
          `${Namespaces.UserInteraction}/selectOptions:${JSON.stringify(config)}`
        );
      }
    }
  );
  connection.onRequest(
    `${Namespaces.UserInteraction}/selectFolder`,
    async (config: SingleSelectConfig) => {
      return { type: "success", result: "C:\\Users\\huajiezhang\\Documents\\workspace\\myapps" };
    }
  );
  connection.onRequest(
    `${Namespaces.UserInteraction}/inputText`,
    async (config: SingleSelectConfig) => {
      return { type: "success", result: `demoapp${new Date().getTime()}` };
    }
  );
  const res = await sendRequest(connection, `${Namespaces.Core}/createProject`, { platform: "vs" });
  console.log(res);
}
