/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import { AppManifestDebugArgs, AppManifestDebugHandler } from "@microsoft/teamsfx-core";

import { workspaceUri } from "../../globalVariables";
import { tools } from "../../handlers";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export class PrepareManifestTaskTerminal extends BaseTaskTerminal {
  private readonly args: AppManifestDebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as AppManifestDebugArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    const workspacePath: string = workspaceUri?.fsPath as string;
    const handler = new AppManifestDebugHandler(
      workspacePath,
      this.args,
      tools.tokenProvider.m365TokenProvider,
      tools.logProvider,
      tools.telemetryReporter,
      tools.ui
    );
    return await handler.prepare();
  }
}
