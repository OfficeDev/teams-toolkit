/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as util from "util";
import * as vscode from "vscode";
import { v4 as uuidv4 } from "uuid";
import { assembleError, FxError, Result, UserError, Void } from "@microsoft/teamsfx-api";
import * as globalVariables from "../../globalVariables";
import { showError } from "../../handlers";
import { ExtensionErrors, ExtensionSource } from "../../error";
import { getDefaultString, localize } from "../../utils/localizeUtils";
import { sendDebugAllEvent } from "../localTelemetryReporter";
import * as commonUtils from "../commonUtils";
import { TelemetryProperty } from "../../telemetry/extTelemetryEvents";

const ControlCodes = {
  CtrlC: "\u0003",
};

export abstract class BaseTaskTerminal implements vscode.Pseudoterminal {
  protected writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  protected closeEmitter = new vscode.EventEmitter<number>();
  onDidClose?: vscode.Event<number> = this.closeEmitter.event;
  protected readonly taskTerminalId: string;

  constructor(private taskDefinition: vscode.TaskDefinition) {
    this.taskTerminalId = uuidv4();
  }

  open(): void {
    this.do()
      .then((res) => {
        const error = res.isErr() ? res.error : undefined;
        this.stop(error);
      })
      .catch((error) => this.stop(error));
  }

  close(): void {
    this.stop();
  }

  handleInput(data: string): void {
    if (data.includes(ControlCodes.CtrlC)) {
      this.stop(BaseTaskTerminal.taskCancelError);
    }
  }

  protected async stop(error?: any): Promise<void> {
    if (error) {
      // TODO: add color
      this.writeEmitter.fire(`${error?.displayMessage ?? error?.message}\r\n`);
      const fxError = assembleError(error);
      showError(fxError);
      this.closeEmitter.fire(1);

      if (commonUtils.getLocalDebugSession().id !== commonUtils.DebugNoSessionId) {
        await sendDebugAllEvent(fxError, { [TelemetryProperty.DebugIsTransparentTask]: "true" });
        commonUtils.endLocalDebugSession();
      }
    }
    this.closeEmitter.fire(0);
  }

  protected abstract do(): Promise<Result<Void, FxError>>;

  public static resolveTeamsFxVariables(str: string): string {
    // Background task cannot resolve variables in VSC.
    // Here Teams Toolkit resolve the workspaceFolder.
    str = str.replace("${workspaceFolder}", globalVariables.workspaceUri?.fsPath ?? "");
    return str;
  }

  public static taskDefinitionError(argName: string): UserError {
    return new UserError(
      ExtensionSource,
      ExtensionErrors.TaskDefinitionError,
      util.format(getDefaultString("teamstoolkit.localDebug.taskDefinitionError"), argName),
      util.format(localize("teamstoolkit.localDebug.taskDefinitionError"), argName)
    );
  }

  public static taskCancelError = new UserError(
    ExtensionSource,
    ExtensionErrors.TaskCancelError,
    getDefaultString("teamstoolkit.localDebug.taskCancelError"),
    localize("teamstoolkit.localDebug.taskCancelError")
  );
}
