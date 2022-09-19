/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import {
  TabDebugArgs,
  TabDebugHandler,
} from "@microsoft/teamsfx-core/build/component/debugHandler";

import VsCodeLogInstance from "../../commonlib/log";
import { workspaceUri } from "../../globalVariables";
import { setUpTabDisplayMessages } from "../constants";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { handleDebugActions } from "./common";

export class SetUpTabTaskTerminal extends BaseTaskTerminal {
  private readonly args: TabDebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as TabDebugArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info(setUpTabDisplayMessages.title);

    const workspacePath: string = workspaceUri?.fsPath as string;
    const handler = new TabDebugHandler(workspacePath, this.args);
    const actions = handler.getActions();

    return await handleDebugActions(actions, setUpTabDisplayMessages);
  }
}
