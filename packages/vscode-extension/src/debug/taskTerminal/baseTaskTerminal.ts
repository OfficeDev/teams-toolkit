/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as util from "util";
import * as vscode from "vscode";
import { assembleError, FxError, Result, UserError, Void } from "@microsoft/teamsfx-api";
import * as globalVariables from "../../globalVariables";
import { showError } from "../../handlers";
import { ExtensionErrors, ExtensionSource } from "../../error";
import { getDefaultString, localize } from "../../utils/localizeUtils";

const ControlCodes = {
  CtrlC: "\u0003",
};

// TODO: ensure local debug session in teamsfx task
export abstract class BaseTaskTerminal implements vscode.Pseudoterminal {
  protected writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  protected closeEmitter = new vscode.EventEmitter<number>();
  onDidClose?: vscode.Event<number> = this.closeEmitter.event;

  constructor(private taskDefinition: vscode.TaskDefinition) {}

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
      this.stop();
    }
  }

  protected async stop(error?: any): Promise<void> {
    if (error) {
      if (error.message === "Debug session exists") {
        // use a specical exit code to indicate this task is terminated as expected
        this.closeEmitter.fire(-1);
        return;
      }

      // TODO: add color
      this.writeEmitter.fire(`${error?.displayMessage ?? error?.message}\r\n`);
      showError(assembleError(error));
      this.closeEmitter.fire(1);
    }
    this.closeEmitter.fire(0);
  }

  protected abstract do(): Promise<Result<Void, FxError>>;

  public static resolveTeamsFxVariables(str: string): string {
    // Background task cannot resolve variables in VSC.
    // Here Teams Toolkit resolve the workspaceFolder.
    // TODO: remove one after decide to use which placeholder
    str = str.replace("${teamsfx:workspaceFolder}", globalVariables.workspaceUri?.fsPath ?? "");
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
}
