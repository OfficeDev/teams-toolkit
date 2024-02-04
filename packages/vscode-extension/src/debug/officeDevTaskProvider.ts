// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as globalVariables from "../globalVariables";

// eslint-disable-next-line prettier/prettier
export class OfficeDevTaskProvider implements vscode.TaskProvider {
  public static readonly type: string = "officedev";

  // eslint-disable-next-line @typescript-eslint/require-await
  public async provideTasks(
    token?: vscode.CancellationToken | undefined
  ): Promise<vscode.Task[] | undefined> {
    return [
      new vscode.Task(
        { type: "officedev", name: "validate" },
        vscode.TaskScope.Workspace,
        "validate",
        "officedev",
        new vscode.ShellExecution(`office-addin-manifest validate manifest.xml`)
      ),
    ];
  }

  resolveTask(
    task: vscode.Task,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Task> {
    // if (task.definition.type !== OfficeDevTaskProvider.type || !task.definition.command) {
    //   return undefined;
    // }

    // if (globalVariables.isOfficeAddInProject) {
    //   const newTask = new vscode.Task(
    //     { type: "officedev", name: "validate" },
    //     vscode.TaskScope.Workspace,
    //     "validate",
    //     "officedev",
    //     new vscode.ShellExecution(`office-addin-manifest validate manifest.xml`)
    //   );
    //   return newTask;
    // }
    return task;
  }
}
