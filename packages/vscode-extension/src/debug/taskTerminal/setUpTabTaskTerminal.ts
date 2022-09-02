/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import { TabDebugArgs, TabDebugHandler } from "@microsoft/teamsfx-core";

import { workspaceUri } from "../../globalVariables";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export class SetUpTabTaskTerminal extends BaseTaskTerminal {
  private readonly args: TabDebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as TabDebugArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    const workspacePath: string = workspaceUri?.fsPath as string;
    const handler = new TabDebugHandler(workspacePath, this.args);
    return await handler.setUp();
  }
}
