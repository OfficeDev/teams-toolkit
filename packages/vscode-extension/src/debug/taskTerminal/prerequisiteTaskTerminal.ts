/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import * as vscode from "vscode";
import { checkAndInstallForTask } from "../prerequisitesHandler";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export interface PrerequisiteArgs {
  prerequisites?: string[];
  portsOccupation?: number[];
}

export enum Prerequisite {
  nodejs = "nodejs",
  m365Account = "m365Account",
  devCert = "devCert",
  func = "func",
  ngrok = "ngrok",
  dotnet = "dotnet",
  portsOccupation = "portsOccupation",
}

export class PrerequisiteTaskTerminal extends BaseTaskTerminal {
  private readonly args: PrerequisiteArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as PrerequisiteArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    return await checkAndInstallForTask(this.args.prerequisites ?? [], this.args.portsOccupation);
  }
}
