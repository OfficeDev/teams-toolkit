import { createMessageConnection } from "vscode-jsonrpc/node";
import WebSocket from "ws";
import { Namespaces } from "../src/namespace";

const ws = new WebSocket("ws://localhost:7920");
ws.on("message", (ms) => {
  console.log(ms.toString());
});
const wsStream = WebSocket.createWebSocketStream(ws, { encoding: "utf8" });
const connection = createMessageConnection(wsStream, wsStream);
connection.listen();

connection
  .sendRequest(`${Namespaces.Core}/createProject`, { platform: "vs" })
  .then((d) => {
    console.log(d);
  })
  .catch((e) => {
    console.error(e);
  });
