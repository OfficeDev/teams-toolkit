// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProductName } from "@microsoft/teamsfx-api";
import * as vscode from "vscode";

import { ext } from "../extensionVariables";

interface IRunningTeamsfxTask {
    source: string;
    name: string;
    scope: vscode.WorkspaceFolder | vscode.TaskScope;
}

const allRunningTeamsfxTasks: Map<IRunningTeamsfxTask, number> = new Map<IRunningTeamsfxTask, number>();

function isTeamsfxTask(task: vscode.Task): boolean {
    // teamsfx: xxx start / xxx watch
    if (task) {
        if (task.source === ProductName && (task.name.trim().toLocaleLowerCase().endsWith("start") || task.name.trim().toLocaleLowerCase().endsWith("watch"))) {
            // provided by toolkit
            return true;
        }

        if (task.definition && task.definition.type === ProductName) {
            // defined by launch.json
            const command = task.definition.command as string;
            return command !== undefined && (command.trim().toLocaleLowerCase().endsWith("start") || command.trim().toLocaleLowerCase().endsWith("watch"));
        }
    }

    return false;
}

function onDidStartTaskProcessHandler(event: vscode.TaskProcessStartEvent): void {
    const task = event.execution.task;
    if (task.scope !== undefined && isTeamsfxTask(task)) {
        allRunningTeamsfxTasks.set({ source: task.source, name: task.name, scope: task.scope}, event.processId);
    }
}

function onDidEndTaskProcessHandler(event: vscode.TaskProcessEndEvent): void {
    const task = event.execution.task;
    if (task.scope !== undefined && isTeamsfxTask(task)) {
        allRunningTeamsfxTasks.delete({ source: task.source, name: task.name, scope: task.scope});
    }
}

function onDidTerminateDebugSessionHandler(event: vscode.DebugSession): void {
    const debugConfig = event.configuration;
    if (debugConfig &&
        debugConfig.name &&
        (debugConfig.url || debugConfig.port) && // it's from launch.json
        !debugConfig.postRestartTask) // and not a restart one
    {
        const extConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("fx-extension");
        if (extConfig.get<boolean>("stopTeamsfxTasksPostDebug", true)) {
            for (const task of allRunningTeamsfxTasks) {
                try {
                    process.kill(task[1], "SIGINT");
                } catch(e) {
                    // ignore and keep killing others
                }
            }
        }

        allRunningTeamsfxTasks.clear();
    }
}

export function registerTeamsfxTaskEvents(): void {
    ext.context.subscriptions.push(vscode.tasks.onDidStartTaskProcess(onDidStartTaskProcessHandler));
    ext.context.subscriptions.push(vscode.tasks.onDidEndTaskProcess(onDidEndTaskProcessHandler));
    ext.context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(onDidTerminateDebugSessionHandler));
} 