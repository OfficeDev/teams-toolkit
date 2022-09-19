/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import {
  SSODebugArgs,
  SSODebugHandler,
} from "@microsoft/teamsfx-core/build/component/debugHandler/sso";

import VsCodeLogInstance from "../../commonlib/log";
import { workspaceUri } from "../../globalVariables";
import { tools } from "../../handlers";
import { setUpSSODisplayMessages } from "../constants";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { handleDebugActions } from "./common";

export class SetUpSSOTaskTerminal extends BaseTaskTerminal {
  private readonly args: SSODebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as SSODebugArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info(setUpSSODisplayMessages.title);

    const workspacePath: string = workspaceUri?.fsPath as string;
    const handler = new SSODebugHandler(
      workspacePath,
      this.args,
      tools.tokenProvider.m365TokenProvider,
      tools.logProvider,
      tools.telemetryReporter,
      tools.ui
    );
    const actions = handler.getActions();

    return await handleDebugActions(actions, setUpSSODisplayMessages);
  }
}
