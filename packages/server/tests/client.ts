// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel, NotImplementedError, SingleSelectConfig } from "@microsoft/teamsfx-api";
import { createMessageConnection } from "vscode-jsonrpc/node";
import WebSocket from "ws";
import os from "os";
import { Namespaces, NotificationTypes, RequestTypes } from "../src/apis";

const ws = new WebSocket("ws://localhost:7920");
ws.on("message", (ms) => {
  console.log(ms.toString());
});
const wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });
const connection = createMessageConnection(wsStream, wsStream);
connection.listen();

async function test() {
  connection.onNotification(NotificationTypes.logger.show, (p1: LogLevel, p2: string) => {});
  connection.onNotification(
    NotificationTypes.telemetry.sendTelemetryEvent,
    (
      p1: string,
      p2: { [key: string]: string } | undefined,
      p3: { [key: string]: number } | undefined
    ) => {}
  );
  connection.onNotification(
    NotificationTypes.telemetry.sendTelemetryErrorEvent,
    (
      p1: string,
      p2: { [key: string]: string } | undefined,
      p3: { [key: string]: number } | undefined,
      p4: string[] | undefined
    ) => {}
  );
  connection.onNotification(
    NotificationTypes.telemetry.sendTelemetryException,
    (
      p1: Error,
      p2: { [key: string]: string } | undefined,
      p3: { [key: string]: number } | undefined
    ) => {}
  );
  connection.onRequest(RequestTypes.ui.selectOption.method, async (config: SingleSelectConfig) => {
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
  });
  connection.onRequest(RequestTypes.ui.selectOptions.method, async (config: SingleSelectConfig) => {
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
  });
  connection.onRequest(RequestTypes.ui.selectFolder.method, async (config: SingleSelectConfig) => {
    return { type: "success", result: os.tmpdir() };
  });
  connection.onRequest(RequestTypes.ui.inputText.method, async (config: SingleSelectConfig) => {
    return { type: "success", result: `demoapp${new Date().getTime()}` };
  });
  const res = await connection.sendRequest(`${Namespaces.Server}/createProjectRequest`, {
    platform: "cli",
  });
  console.log(res);
  connection.dispose();
}

(async () => {
  await test();
})();
