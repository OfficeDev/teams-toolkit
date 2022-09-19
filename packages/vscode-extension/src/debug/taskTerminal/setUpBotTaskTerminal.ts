/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { assembleError, err, FxError, Result, Void } from "@microsoft/teamsfx-api";
import {
  BotDebugArgs,
  BotDebugHandler,
  DebugArgumentEmptyError,
} from "@microsoft/teamsfx-core/build/component/debugHandler";

import VsCodeLogInstance from "../../commonlib/log";
import { workspaceUri } from "../../globalVariables";
import { tools } from "../../handlers";
import { setUpBotDisplayMessages, taskNamePrefix } from "../constants";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { handleDebugActions } from "./common";
import { LocalTunnelTaskTerminal } from "./localTunnelTaskTerminal";

export class SetUpBotTaskTerminal extends BaseTaskTerminal {
  private readonly args: BotDebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as BotDebugArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    try {
      if (!this.args.botMessagingEndpoint || this.args.botMessagingEndpoint.trim().length === 0) {
        return err(DebugArgumentEmptyError("botMessagingEndpoint"));
      }

      if (!this.args.botMessagingEndpoint.startsWith("http")) {
        if (!this.args.botMessagingEndpoint.startsWith("/")) {
          this.args.botMessagingEndpoint = `/${this.args.botMessagingEndpoint}`;
        }
        const botTunnelEndpoint = await LocalTunnelTaskTerminal.getNgrokEndpoint();
        this.args.botMessagingEndpoint = `${botTunnelEndpoint}${this.args.botMessagingEndpoint}`;
      }
    } catch (error: unknown) {
      return err(assembleError(error));
    }

    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info(`${taskNamePrefix}${setUpBotDisplayMessages.taskName}`);
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
