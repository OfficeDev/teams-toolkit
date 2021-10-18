"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-jsonrpc/node");
const ws_1 = __importDefault(require("ws"));
const handler_1 = require("./handler");
const port = 7920;
const wss = new ws_1.default.Server({ port: port });
wss.on("connection", function cb(ws) {
  return __awaiter(this, void 0, void 0, function* () {
    console.log(`connection`);
    const wsStream = ws_1.default.createWebSocketStream(ws, { encoding: "utf8" });
    const connection = (0, node_1.createMessageConnection)(wsStream, wsStream);
    (0, handler_1.initHandler)(connection);
    ws.on("message", (ms) => {
      console.log(ms.toString());
    });
    connection.onRequest("createProject", handler_1.createProject);
    connection.listen();
  });
});
console.log(`server started at ws://localhost:${port}`);
//# sourceMappingURL=index.js.map
