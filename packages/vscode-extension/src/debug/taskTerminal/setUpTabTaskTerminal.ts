/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import {
  TabDebugArgs,
  TabDebugHandler,
} from "@microsoft/teamsfx-core/build/component/debugHandler";

import VsCodeLogInstance from "../../commonlib/log";
import { workspaceUri } from "../../globalVariables";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import * as commonUtils from "../commonUtils";
import { tools } from "../../handlers";
import { setUpTabDisplayMessages } from "../constants";
import { localTelemetryReporter, maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { handleDebugActions } from "./common";
import { TaskDefaultValue } from "@microsoft/teamsfx-core/build/common/local";

export class SetUpTabTaskTerminal extends BaseTaskTerminal {
  private readonly args: TabDebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as TabDebugArgs;
  }

  do(): Promise<Result<Void, FxError>> {
    return Correlator.runWithId(commonUtils.getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryProperties(
        TelemetryEvent.DebugSetUpTabTask,
        {
          [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
          [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
            baseUrl: maskValue(this.args.baseUrl, [TaskDefaultValue.setUpTab.baseUrl]),
          }),
        },
        () => this._do()
      )
    );
  }

  private async _do(): Promise<Result<Void, FxError>> {
    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info(setUpTabDisplayMessages.title);
    VsCodeLogInstance.outputChannel.appendLine("");

    const workspacePath: string = workspaceUri?.fsPath as string;
    const handler = new TabDebugHandler(
      workspacePath,
      this.args,
      tools.tokenProvider.m365TokenProvider,
      tools.logProvider,
      tools.telemetryReporter!,
      tools.ui
    );
    const actions = handler.getActions();

    const res = await handleDebugActions(actions, setUpTabDisplayMessages);
    const duration = this.getDurationInSeconds();
    if (res.isOk() && duration) {
      VsCodeLogInstance.info(setUpTabDisplayMessages.durationMessage(duration));
    }
    return res;
  }
}
