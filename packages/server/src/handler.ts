// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { CancellationToken, MessageConnection, ResponseError } from "vscode-jsonrpc";
import { RemoteTools } from "./tools";

let Core: FxCore;

export function initHandler(connection: MessageConnection) {
  Core = new FxCore(new RemoteTools(connection));
}

export async function createProject(
  inputs: Inputs,
  token: CancellationToken
): Promise<string | ResponseError<Error>> {
  console.log("createProject");
  const res = await Core.createProject(inputs);
  if (res.isOk()) return res.value;
  return new ResponseError(-32000, res.error.message, res.error);
}
