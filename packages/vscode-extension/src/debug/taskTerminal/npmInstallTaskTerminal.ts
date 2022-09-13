/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";
import * as path from "path";
import { FxError, Result, ok, Void } from "@microsoft/teamsfx-api";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { checkAndInstallNpmPackagesForTask } from "../prerequisitesHandler";
import * as globalVariables from "../../globalVariables";

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

  async do(): Promise<Result<Void, FxError>> {
    if (!this.args?.projects || this.args.projects.length === 0) {
      return ok(Void);
    }

    const npmInstallProjectOptions = this.args.projects.map((projectOption) => {
      if (!projectOption.cwd) {
        throw BaseTaskTerminal.taskDefinitionError("cwd");
      }

      return {
        cwd: path.resolve(
          globalVariables.workspaceUri?.fsPath ?? "",
          BaseTaskTerminal.resolveTeamsFxVariables(projectOption.cwd)
        ),
        args: projectOption.npmInstallArgs,
        forceUpdate: this.args.forceUpdate,
      };
    });

    return await checkAndInstallNpmPackagesForTask(npmInstallProjectOptions);
  }
}
