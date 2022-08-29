/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";
import { checkAndInstallV2 } from "../prerequisitesHandler";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export interface PrerequisiteArgs {
  prerequisites?: string[];
  ports?: number[];
}

export enum Prerequisite {
  nodejs = "nodejs",
  m365Account = "m365Account",
  devCert = "devCert",
  func = "func",
  ngrok = "ngrok",
  dotnet = "dotnet",
  ports = "ports",
}

export class PrerequisiteTaskTerminal extends BaseTaskTerminal {
  private readonly args: PrerequisiteArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as PrerequisiteArgs;
  }

  async do(): Promise<void> {
    await checkAndInstallV2(this.args.prerequisites ?? [], this.args.ports);
  }
}
