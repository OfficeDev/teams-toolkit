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
  const res = await sendRequest(connection, `${Namespaces.Core}/createProject`, { platform: "vs" });
  console.log(res);
}
