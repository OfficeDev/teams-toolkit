// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { createMessageConnection } from "vscode-jsonrpc/node";
import WebSocket from "ws";
import ServerConnection from "./serverConnection";

const port = 7920;
const wss = new WebSocket.Server({ port: port });

wss.on("connection", async function cb(ws) {
  const wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });
  const connection = new ServerConnection(createMessageConnection(wsStream, wsStream));
  ws.on("message", (ms) => {
    console.log(`recv:${ms.toString()}`);
  });
  connection.listen();
});

console.log(`server started at ws://localhost:${port}`);
