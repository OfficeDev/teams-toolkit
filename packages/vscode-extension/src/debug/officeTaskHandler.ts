import * as vscode from "vscode";
import * as globalVariables from "../globalVariables";
import { Correlator, isValidOfficeAddInProject } from "@microsoft/teamsfx-core";
import { DebugNoSessionId, endLocalDebugSession, getLocalDebugSession, getLocalDebugSessionId } from "./commonUtils";
import { updateProjectStatus } from "../utils/projectStatusUtils";
import { CommandKey } from "../constants";
import { UserError, err, ok } from "@microsoft/teamsfx-api";
import { ExtensionErrors, ExtensionSource } from "../error";
import * as commonUtils from "./commonUtils";
import { DebugSessionExists } from "./constants";

export const allRunningOfficeTasks: Map<string, number> = new Map<string, number>();
export const allRunningDebugSessions: Set<string> = new Set<string>();

export const OfficeTaskName = Object.freeze({
    ExcelDesktopEdgeChromium: "Excel Desktop (Edge Chromium)",
    ExcelDesktopEdgeLegacy: "Excel Desktop (Edge Legacy)",
    DebugOutlookDesktop: "Debug: Excel Desktop",
    PowerPointDesktopEdgeChromium: "PowerPoint Desktop (Edge Chromium)",
    PowerPointDesktopEdgeLegacy: "PowerPoint Desktop (Edge Legacy)",
    DebugPowerPointDesktop: "Debug: PowerPoint Desktop",
    WordDesktopEdgeChromium: "Word Desktop (Edge Chromium)",
    WordDesktopEdgeLegacy: "Word Desktop (Edge Legacy)",
    DebugWordDesktop: "Debug: Word Desktop",
});

const trackedTasks = new Set<string>();

function getTaskKey(task: vscode.Task): string {
    if (task === undefined) {
        ;;

        return "";
    }

    // "source|name|scope"
    const scope = (task.scope as vscode.WorkspaceFolder)?.uri?.toString() || task.scope?.toString();
    return `${task.source}|${task.name}|${scope ?? ""}`;
}

function isOfficeTask(task: vscode.Task): boolean {
    if (task) {
        const taskName = task.name;
        if (Object.values(OfficeTaskName).includes(taskName)) {
            return true;
        }
    }
    return false;
}

function isDebugPreLaunchTask(task: vscode.Task): boolean {
    if (task) {
        // Debug: PowerPoint Desktop
        // Debug: Word Desktop
        // Debug: Excel Desktop
        if (task.execution && <vscode.ShellExecution>task.execution) {
            const execution = <vscode.ShellExecution>task.execution;
            const commandLine =
                execution.commandLine ||
                `${typeof execution.command === "string" ? execution.command : execution.command.value} ${(
                    execution.args || []
                ).join(" ")}`;
            if (/npm[\s]+run[\s]+start:desktop -- --app (word|excel|powerpoint)/i.test(commandLine)) {
                return true;
            }
        }
    }

    return false;
}

async function onDidStartTaskHandler(event: vscode.TaskStartEvent): Promise<void> {
    if (isOfficeTask(event.execution.task)) {
        trackedTasks.add(event.execution.task.name);
        if (isDebugPreLaunchTask(event.execution.task)) {
            if (await commonUtils.checkAndSkipDebugging()) {
                throw new Error(DebugSessionExists);
            } else {
                commonUtils.startLocalDebugSession();
            }
        }
    }
}

function onDidEndTaskHandler(event: vscode.TaskEndEvent): void {
    if (isOfficeTask(event.execution.task)) {
        trackedTasks.delete(event.execution.task.name);
    }
}

async function onDidStartTaskProcessHandler(event: vscode.TaskProcessStartEvent): Promise<void> {
    if (globalVariables.workspaceUri && isValidOfficeAddInProject(globalVariables.workspaceUri.fsPath)) {
        const task = event.execution.task;
        if (task.scope !== undefined && isOfficeTask(task)) {
            allRunningOfficeTasks.set(getTaskKey(task), event.processId);

            if (isDebugPreLaunchTask(task)) {
                // Handle cases that some services failed immediately after start.
                const currentSession = getLocalDebugSession();
                if (currentSession.id !== DebugNoSessionId) {
                    if (currentSession.failedServices.length > 0) {
                        terminateAllRunningOfficeTasks();
                        await vscode.debug.stopDebugging();
                        if (globalVariables.workspaceUri?.fsPath) {
                            await updateProjectStatus(
                                globalVariables.workspaceUri.fsPath,
                                CommandKey.LocalDebug,
                                err(
                                    new UserError({
                                        source: ExtensionSource,
                                        name: ExtensionErrors.DebugServiceFailedBeforeStartError,
                                    })
                                ),
                                true
                            );
                        }
                        endLocalDebugSession();
                        return;
                    }

                    await updateProjectStatus(
                        globalVariables.workspaceUri.fsPath,
                        CommandKey.LocalDebug,
                        ok(undefined),
                        true
                    );
                }
            }
        }
    }
}


async function onDidEndTaskProcessHandler(event: vscode.TaskProcessEndEvent): Promise<void> {
    const timestamp = new Date();
    const task = event.execution.task;

    if (task.scope !== undefined && isOfficeTask(task)) {
        const currentSession = getLocalDebugSession();
        if (event.exitCode !== 0) {
            currentSession.failedServices.push({ name: task.name, exitCode: event.exitCode });
        }
        allRunningOfficeTasks.delete(getTaskKey(task));
        if (isDebugPreLaunchTask(task)) {
            // If this pre launch task (Debug: Excel/Word/PowerPoint Desktop) exits (even exitCode is 0) before being successfully started, the debug fails.
            if (currentSession.id !== DebugNoSessionId) {
                terminateAllRunningOfficeTasks();
                if (globalVariables.workspaceUri?.fsPath) {
                    await updateProjectStatus(
                        globalVariables.workspaceUri.fsPath,
                        CommandKey.LocalDebug,
                        err(
                            new UserError({
                                source: ExtensionSource,
                                name: ExtensionErrors.DebugServiceFailedBeforeStartError,
                            })
                        ),
                        true
                    );
                }
                endLocalDebugSession();
            }
        }
    }
}


async function onDidStartDebugSessionHandler(event: vscode.DebugSession): Promise<void> {
    if (globalVariables.workspaceUri && isValidOfficeAddInProject(globalVariables.workspaceUri.fsPath)) {
        const debugConfig = event.configuration;
        if (
            debugConfig &&
            debugConfig.name &&
            !debugConfig.postDebugTask
        ) {
            allRunningDebugSessions.add(event.id);
        }

        // Handle cases that some services failed immediately after start.
        const currentSession = getLocalDebugSession();
        if (currentSession.id !== DebugNoSessionId && currentSession.failedServices.length > 0) {
            terminateAllRunningOfficeTasks();
            await vscode.debug.stopDebugging();
            if (globalVariables.workspaceUri?.fsPath) {
                await updateProjectStatus(
                    globalVariables.workspaceUri.fsPath,
                    CommandKey.LocalDebug,
                    err(
                        new UserError({
                            source: ExtensionSource,
                            name: ExtensionErrors.DebugServiceFailedBeforeStartError,
                        })
                    ),
                    true
                );
            }
            endLocalDebugSession();
            return;
        }

        await updateProjectStatus(
            globalVariables.workspaceUri.fsPath,
            CommandKey.LocalDebug,
            ok(undefined),
            true
        );
    }
}

function onDidTerminateDebugSessionHandler(event: vscode.DebugSession): void {
    if (allRunningDebugSessions.has(event.id)) {
        // a valid debug session

        terminateAllRunningOfficeTasks();

        allRunningDebugSessions.delete(event.id);
        if (allRunningDebugSessions.size == 0) {
            endLocalDebugSession();
        }
        allRunningOfficeTasks.clear();
    }
}

export function terminateAllRunningOfficeTasks(): void {
    for (const task of allRunningOfficeTasks) {
        try {
            if (task[1] > 0) {
                process.kill(task[1], "SIGTERM");
            }
        } catch (e) {
            // ignore and keep killing others
        }
    }
    allRunningOfficeTasks.clear();
}

export function registerOfficeTaskAndDebugEvents(): void {
    globalVariables.context.subscriptions.push({
        dispose() {
            trackedTasks.clear();
        },
    });

    globalVariables.context.subscriptions.push(vscode.tasks.onDidStartTask(onDidStartTaskHandler));
    globalVariables.context.subscriptions.push(vscode.tasks.onDidEndTask(onDidEndTaskHandler));

    globalVariables.context.subscriptions.push(
        vscode.tasks.onDidStartTaskProcess((event: vscode.TaskProcessStartEvent) =>
            Correlator.runWithId(getLocalDebugSessionId(), onDidStartTaskProcessHandler, event)
        )
    );

    globalVariables.context.subscriptions.push(
        vscode.tasks.onDidEndTaskProcess((event: vscode.TaskProcessEndEvent) =>
            Correlator.runWithId(getLocalDebugSessionId(), onDidEndTaskProcessHandler, event)
        )
    );

    globalVariables.context.subscriptions.push(
        vscode.debug.onDidStartDebugSession((event: vscode.DebugSession) =>
            Correlator.runWithId(getLocalDebugSessionId(),
                onDidStartDebugSessionHandler,
                event
            )
        )
    );
    globalVariables.context.subscriptions.push(
        vscode.debug.onDidTerminateDebugSession((event: vscode.DebugSession) =>
            Correlator.runWithId(getLocalDebugSessionId(),
                onDidTerminateDebugSessionHandler,
                event
            )
        )
    );
}