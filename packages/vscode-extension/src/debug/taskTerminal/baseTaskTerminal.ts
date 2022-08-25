/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";

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
      .then(() => this.stop())
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

  protected stop(error?: any): void {
    if (error?.message) {
      // TODO: add color
      this.writeEmitter.fire(`${error?.message}\r\n`);
    }
    const exitCode = error ? 1 : 0;
    this.closeEmitter.fire(exitCode);
  }

  protected abstract do(): Promise<void>;
}
