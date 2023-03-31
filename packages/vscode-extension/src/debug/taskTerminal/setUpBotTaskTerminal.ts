/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { assembleError, err, FxError, Result, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import {
  BotDebugArgs,
  BotDebugHandler,
  DebugArgumentEmptyError,
} from "@microsoft/teamsfx-core/build/component/debugHandler";

import VsCodeLogInstance from "../../commonlib/log";
import { workspaceUri } from "../../globalVariables";
import { tools } from "../../handlers";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import * as commonUtils from "../commonUtils";
import { setUpBotDisplayMessages } from "../constants";
import { DefaultPlaceholder, localTelemetryReporter, maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { handleDebugActions } from "./common";
import { NgrokTunnelTaskTerminal } from "./ngrokTunnelTaskTerminal";
import { TaskDefaultValue } from "@microsoft/teamsfx-core/build/common/local";

export class SetUpBotTaskTerminal extends BaseTaskTerminal {
  private readonly args: BotDebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as BotDebugArgs;
  }

  do(): Promise<Result<Void, FxError>> {
    return Correlator.runWithId(commonUtils.getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryProperties(
        TelemetryEvent.DebugSetUpBotTask,
        {
          [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
          [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
            botId: maskValue(this.args.botId),
            botMessagingEndpoint: maskValue(this.args.botMessagingEndpoint, [
              { value: TaskDefaultValue.setUpBot.botMessagingEndpoint, mask: DefaultPlaceholder },
            ]),
          }),
        },
        () => this._do()
      )
    );
  }

  private async _do(): Promise<Result<Void, FxError>> {
    try {
      if (!this.args.botMessagingEndpoint || this.args.botMessagingEndpoint.trim().length === 0) {
        return err(DebugArgumentEmptyError("botMessagingEndpoint"));
      }

      if (!this.args.botMessagingEndpoint.startsWith("http")) {
        if (!this.args.botMessagingEndpoint.startsWith("/")) {
          this.args.botMessagingEndpoint = `/${this.args.botMessagingEndpoint}`;
        }
        const botTunnelEndpoint = await NgrokTunnelTaskTerminal.getNgrokEndpoint();
        this.args.botMessagingEndpoint = `${botTunnelEndpoint}${this.args.botMessagingEndpoint}`;
      }
    } catch (error: unknown) {
      return err(assembleError(error));
    }

    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info(setUpBotDisplayMessages.title);
    VsCodeLogInstance.outputChannel.appendLine("");

    const workspacePath: string = workspaceUri?.fsPath as string;
    const handler = new BotDebugHandler(
      workspacePath,
      this.args,
      tools.tokenProvider.m365TokenProvider,
      tools.logProvider,
      tools.telemetryReporter!,
      tools.ui
    );
    const actions = handler.getActions();

    const res = await handleDebugActions(actions, setUpBotDisplayMessages);
    const duration = this.getDurationInSeconds();
    if (res.isOk() && duration) {
      VsCodeLogInstance.info(setUpBotDisplayMessages.durationMessage(duration));
    }
    return res;
  }
}
