/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export interface PrerequisiteArgs {
  prerequisites?: string[];
  ports?: number[];
}

export class PrerequisiteTaskTerminal extends BaseTaskTerminal {
  private readonly args: PrerequisiteArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as PrerequisiteArgs;
  }

  async do(): Promise<void> {
    // TODO: use _checkAndInstall in prerequisiteHandler
  }
}
