// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";
import { Stage } from "@microsoft/teamsfx-api";
import { VS_CODE_UI } from "../qm/vsc_ui";
import { core } from "../globalVariables";
import { getSystemInputs } from "./systemEnvUtils";

export async function triggerV3Migration(): Promise<void> {
  const inputs = getSystemInputs();
  inputs.stage = Stage.debug;
  const result = await core.phantomMigrationV3(inputs);
  if (result.isErr()) {
    await vscode.debug.stopDebugging();
    throw result.error;
  }
  // reload window to terminate debugging
  await VS_CODE_UI.reload();
}
