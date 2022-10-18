/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";

import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import {
  SSODebugArgs,
  SSODebugHandler,
} from "@microsoft/teamsfx-core/build/component/debugHandler/sso";

import VsCodeLogInstance from "../../commonlib/log";
import { workspaceUri } from "../../globalVariables";
import { tools } from "../../handlers";
import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import * as commonUtils from "../commonUtils";
import { setUpSSODisplayMessages } from "../constants";
import { localTelemetryReporter, maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { handleDebugActions } from "./common";

export class SetUpSSOTaskTerminal extends BaseTaskTerminal {
  private readonly args: SSODebugArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as SSODebugArgs;
  }

  do(): Promise<Result<Void, FxError>> {
    return Correlator.runWithId(commonUtils.getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryProperties(
        TelemetryEvent.DebugSetUpSSOTask,
        {
          [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
          [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
            accessAsUserScopeId: maskValue(this.args.accessAsUserScopeId),
            clientId: maskValue(this.args.clientId),
            clientSecret: maskValue(this.args.clientSecret),
            objectId: maskValue(this.args.objectId),
          }),
        },
        () => this._do()
      )
    );
  }

  private async _do(): Promise<Result<Void, FxError>> {
    VsCodeLogInstance.outputChannel.show();
    VsCodeLogInstance.info(setUpSSODisplayMessages.title);
    VsCodeLogInstance.outputChannel.appendLine("");

    const workspacePath: string = workspaceUri?.fsPath as string;
    const handler = new SSODebugHandler(
      workspacePath,
      this.args,
      tools.tokenProvider.m365TokenProvider,
      tools.logProvider,
      tools.telemetryReporter!,
      tools.ui
    );
    const actions = handler.getActions();

    const res = await handleDebugActions(actions, setUpSSODisplayMessages);
    const duration = this.getDurationInSeconds();
    if (res.isOk() && duration) {
      VsCodeLogInstance.info(setUpSSODisplayMessages.durationMessage(duration));
    }
    return res;
  }
}
