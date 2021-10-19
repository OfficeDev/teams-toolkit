// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { createMessageConnection } from "vscode-jsonrpc/node";
import WebSocket from "ws";
import { createProject, initCore } from "./handler";

const port = 7920;
const wss = new WebSocket.Server({ port: port });

wss.on("connection", async function cb(ws) {
  console.log(`connection`);
  const wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });
  const connection = createMessageConnection(wsStream, wsStream);
  initCore(connection);
  ws.on("message", (ms) => {
    console.log(ms.toString());
  });
  connection.onRequest("createProject", createProject);
  connection.listen();
});

console.log(`server started at ws://localhost:${port}`);
