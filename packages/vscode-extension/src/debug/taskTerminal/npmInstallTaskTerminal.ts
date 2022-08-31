/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from "vscode";
import * as util from "util";
import * as path from "path";
import * as globalVariables from "../../globalVariables";
import { UserError } from "@microsoft/teamsfx-api";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { checkAndInstallNpmPackagesForTask } from "../prerequisitesHandler";
import { ExtensionErrors, ExtensionSource } from "../../error";
import { getDefaultString, localize } from "../../utils/localizeUtils";

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
        throw new UserError(
          ExtensionSource,
          ExtensionErrors.TaskDefinitionError,
          util.format(getDefaultString("teamstoolkit.localDebug.taskDefinitionError"), "cwd"),
          util.format(localize("teamstoolkit.localDebug.taskDefinitionError"), "cwd")
        );
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

    await checkAndInstallNpmPackagesForTask(npmInstallProjectOptions);
  }
}
