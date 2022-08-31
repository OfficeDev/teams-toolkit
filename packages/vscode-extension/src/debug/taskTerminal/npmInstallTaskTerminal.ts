/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import * as globalVariables from "../../globalVariables";
import { npmInstallTask } from "../prerequisitesHandler";
import * as path from "path";

export interface NpmInstallArgs {
  projects?: ProjectOptions[];
  forceUpdate?: boolean;
}

interface ProjectOptions {
  cwd?: string;
  npmInstallArgs?: string[];
}

export class NpmInstallTaskTerminal extends BaseTaskTerminal {
  private readonly args: NpmInstallArgs;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as NpmInstallArgs;
  }

  async do(): Promise<void> {
    if (!this.args?.projects || this.args.projects.length === 0) {
      return;
    }

    const npmInstallProjectOptions = this.args.projects.map((projectOption) => {
      if (!projectOption.cwd) {
        // TODO: update error and test
        throw new Error("error");
      }

      return {
        cwd: path.normalize(
          projectOption.cwd.replace(
            "${teamsfx:workspaceFolder}",
            globalVariables.workspaceUri?.fsPath ?? ""
          )
        ),
        args: projectOption.npmInstallArgs,
        forceUpdate: this.args.forceUpdate,
      };
    });

    await npmInstallTask(npmInstallProjectOptions);
  }
}
