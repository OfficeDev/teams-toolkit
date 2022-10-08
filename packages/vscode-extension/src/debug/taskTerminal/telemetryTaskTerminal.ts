/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";

import { FxError, Result, Void, ok } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import { TaskCommand, TaskLabel } from "@microsoft/teamsfx-core/build/common/local";

import { TelemetryEvent, TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import * as commonUtils from "../commonUtils";
import { localTelemetryReporter, maskValue, UnknownPlaceholder } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import * as globalVariables from "../../globalVariables";
import { TeamsfxTaskProvider } from "../teamsfxTaskProvider";

interface ITaskJson {
  tasks?: ITask[];
}

interface ITask {
  label?: string;
  type?: string;
  command?: string;
  dependsOn?: string | string[];
}

export class TelemetryTaskTerminal extends BaseTaskTerminal {
  public static readonly nameList = ["Start Teams App Locally"];
  private readonly args: any;

  constructor(taskDefinition: vscode.TaskDefinition, private name: string) {
    super(taskDefinition);
  }

  async do(): Promise<Result<Void, FxError>> {
    try {
      if (!globalVariables.isTeamsFxProject || !globalVariables.workspaceUri?.fsPath) {
        return ok(Void);
      }
      const taskFilePath = path.resolve(
        globalVariables.workspaceUri.fsPath,
        ".vscode",
        "tasks.json"
      );
      if (!(await fs.pathExists(taskFilePath))) {
        return ok(Void);
      }

      const taskJson = (await fs.readJSON(taskFilePath)) as ITaskJson;
      const overallTask = this.findTask(taskJson, TaskLabel.Overall);
      if (!overallTask || !overallTask.dependsOn) {
        return ok(Void);
      }

      const labelList: string[] = Array.isArray(overallTask.dependsOn)
        ? overallTask.dependsOn
        : typeof overallTask.dependsOn === "string"
        ? [overallTask.dependsOn]
        : [];

      const dependsOnList = [];
      for (const label of labelList) {
        const task = this.findTask(taskJson, label);
        const isTeamsFxTask = task?.type === TeamsfxTaskProvider.type;

        // Only send the info scaffold by Teams Toolkit. If user changed some property, the value will be "unknown".
        dependsOnList.push({
          label: maskValue(label, Object.values(TaskLabel)),
          type: maskValue(task?.type, [TeamsfxTaskProvider.type]),
          command: !isTeamsFxTask
            ? UnknownPlaceholder
            : maskValue(task?.type, Object.values(TaskCommand)),
        });

        localTelemetryReporter.sendTelemetryEvent(TelemetryEvent.DebugOverallTask, {
          [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
          [TelemetryProperty.DebugTaskDependsOn]: JSON.stringify(dependsOnList),
        });
      }
    } catch {}

    // Always return true even if send telemetry failed
    return ok(Void);
  }

  private findTask(taskJson: ITaskJson, label: string): ITask | undefined {
    return taskJson?.tasks?.find((task) => task?.label === label);
  }
}
