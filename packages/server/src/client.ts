// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NotImplementedError, SingleSelectConfig } from "@microsoft/teamsfx-api";
import { createMessageConnection } from "vscode-jsonrpc/node";
import WebSocket from "ws";
import { Namespaces } from "./namespace";
import { sendRequest } from "./utils";
import os from "os";

const ws = new WebSocket("ws://localhost:7920");
ws.on("message", (ms) => {
  console.log(ms.toString());
});
const wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });
const connection = createMessageConnection(wsStream, wsStream);
connection.listen();

async function test() {
  connection.onRequest(
    `${Namespaces.UserInteraction}/SelectOption`,
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
    `${Namespaces.UserInteraction}/SelectOptions`,
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
    `${Namespaces.UserInteraction}/SelectFolder`,
    async (config: SingleSelectConfig) => {
      return { type: "success", result: os.tmpdir() };
    }
  );
  connection.onRequest(
    `${Namespaces.UserInteraction}/InputText`,
    async (config: SingleSelectConfig) => {
      return { type: "success", result: `demoapp${new Date().getTime()}` };
    }
  );
  const res = await sendRequest(connection, `${Namespaces.Server}/createProjectRequest`, {
    platform: "vs",
  });
  console.log(res);
}

(async () => {
  await test();
})();
