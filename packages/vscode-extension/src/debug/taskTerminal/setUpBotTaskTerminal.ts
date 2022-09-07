/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import { BotDebugArgs, BotDebugHandler } from "@microsoft/teamsfx-core";

import VsCodeLogInstance from "../../commonlib/log";
import { workspaceUri } from "../../globalVariables";
import { tools } from "../../handlers";
import { setUpBotDisplayMessages } from "../constants";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { handleDebugActions } from "./common";

export class SetUpBotTaskTerminal extends BaseTaskTerminal {
  private readonly args: BotDebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as BotDebugArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info(setUpBotDisplayMessages.taskName);
    VsCodeLogInstance.outputChannel.appendLine(setUpBotDisplayMessages.check);

    const workspacePath: string = workspaceUri?.fsPath as string;
    const handler = new BotDebugHandler(
      workspacePath,
      this.args,
      tools.tokenProvider.m365TokenProvider,
      tools.logProvider,
      tools.telemetryReporter,
      tools.ui
    );
    const actions = handler.getActions();

    return await handleDebugActions(actions, setUpBotDisplayMessages);
  }
}
