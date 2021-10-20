// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { CancellationToken, MessageConnection, ResponseError } from "vscode-jsonrpc";
import { RemoteTools } from "./tools";
import { convertToHandlerResult } from "./utils";

let Core: FxCore;

export function initCore(connection: MessageConnection) {
  Core = new FxCore(new RemoteTools(connection));
}

export async function createProject(
  inputs: Inputs,
  token?: CancellationToken
): Promise<string | ResponseError<FxError>> {
  console.log(`createProject:${JSON.stringify(inputs)}`);
  const res = await Core.createProject(inputs);
  return convertToHandlerResult(res);
}
