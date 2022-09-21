/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FxError, Result, Void } from "@microsoft/teamsfx-api";
import * as vscode from "vscode";
import { checkAndInstallForTask } from "../prerequisitesHandler";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import * as commonUtils from "../commonUtils";
import { DebugSessionExists } from "../constants";

export interface PrerequisiteArgs {
  prerequisites?: string[];
  portOccupancy?: number[];
}

export enum Prerequisite {
  nodejs = "nodejs",
  m365Account = "m365Account",
  devCert = "devCert",
  func = "func",
  ngrok = "ngrok",
  dotnet = "dotnet",
  portOccupancy = "portOccupancy",
}

export class PrerequisiteTaskTerminal extends BaseTaskTerminal {
  private readonly args: PrerequisiteArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as PrerequisiteArgs;
  }

  async do(): Promise<Result<Void, FxError>> {
    if (commonUtils.checkAndSkipDebugging()) {
      throw new Error(DebugSessionExists);
    }
    return await checkAndInstallForTask(this.args.prerequisites ?? [], this.args.portOccupancy);
  }
}
