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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = exports.initHandler = void 0;
const teamsfx_core_1 = require("@microsoft/teamsfx-core");
const vscode_jsonrpc_1 = require("vscode-jsonrpc");
const tools_1 = require("./tools");
let Core;
function initHandler(connection) {
  Core = new teamsfx_core_1.FxCore(new tools_1.RemoteTools(connection));
}
exports.initHandler = initHandler;
function createProject(inputs, token) {
  return __awaiter(this, void 0, void 0, function* () {
    console.log("createProject");
    const res = yield Core.createProject(inputs);
    if (res.isOk()) return res.value;
    return new vscode_jsonrpc_1.ResponseError(-32000, res.error.message, res.error);
  });
}
exports.createProject = createProject;
//# sourceMappingURL=handler.js.map
