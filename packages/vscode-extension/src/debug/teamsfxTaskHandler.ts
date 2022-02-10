// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProductName } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import * as vscode from "vscode";
import {
  endLocalDebugSession,
  getLocalDebugSessionId,
  getLocalTeamsAppId,
  getNpmInstallLogInfo,
} from "./commonUtils";
import { ext } from "../extensionVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import { Correlator, getHashedEnv, isValidProject } from "@microsoft/teamsfx-core";
import * as path from "path";
import { errorDetail, issueChooseLink, issueLink, issueTemplate } from "./constants";
import * as StringResources from "../resources/Strings.json";
import * as util from "util";
import VsCodeLogInstance from "../commonlib/log";
import { globalStateGet, globalStateUpdate } from "@microsoft/teamsfx-core";
import * as constants from "../debug/constants";
import { ExtensionSurvey } from "../utils/survey";
import { TreatmentVariableValue } from "../exp/treatmentVariables";
import { TeamsfxDebugConfiguration } from "./teamsfxDebugProvider";

const allRunningTeamsfxTasks: Map<string, number> = new Map<string, number>();
const allRunningDebugSessions: Set<string> = new Set<string>();
const activeNpmInstallTasks = new Set<string>();

/**
 * This EventEmitter is used to track all running tasks called by `runTask`.
 * Each task executed by `runTask` will have an internal task id.
 * Event emitters use this id to identify each tracked task, and `runTask` matches this id
 * to determine whether a task is terminated or not.
 */
export let taskEndEventEmitter: vscode.EventEmitter<{
  id: string;
  name: string;
  exitCode?: number;
}>;
let taskStartEventEmitter: vscode.EventEmitter<string>;
export const trackedTasks = new Map<string, string>();

function getTaskKey(task: vscode.Task): string {
  if (task === undefined) {
    return "";
  }

  // "source|name|scope"
  const scope = (task.scope as vscode.WorkspaceFolder)?.uri?.toString() || task.scope?.toString();
  return `${task.source}|${task.name}|${scope}`;
}

function isNpmInstallTask(task: vscode.Task): boolean {
  if (task) {
    return task.name.trim().toLocaleLowerCase().endsWith("npm install");
  }

  return false;
}

function isTeamsfxTask(task: vscode.Task): boolean {
  // teamsfx: xxx start / xxx watch
  if (task) {
    if (
      task.source === ProductName &&
      (task.name.trim().toLocaleLowerCase().endsWith("start") ||
        task.name.trim().toLocaleLowerCase().endsWith("watch"))
    ) {
      // provided by toolkit
      return true;
    }

    if (task.definition && task.definition.type === ProductName) {
      // defined by launch.json
      const command = task.definition.command as string;
      return (
        command !== undefined &&
        (command.trim().toLocaleLowerCase().endsWith("start") ||
          command.trim().toLocaleLowerCase().endsWith("watch"))
      );
    }

    // dev:teamsfx and watch:teamsfx
    let commandLine: string | undefined;
    if (task.execution && <vscode.ShellExecution>task.execution) {
      const execution = <vscode.ShellExecution>task.execution;
      commandLine =
        execution.commandLine || `${execution.command} ${(execution.args || []).join(" ")}`;
    }
    if (commandLine !== undefined) {
      return /(npm|yarn)[\s]+(run )?[\s]*(dev|watch):teamsfx/i.test(commandLine);
    }
  }

  return false;
}

function displayTerminal(taskName: string): boolean {
  const terminal = vscode.window.terminals.find((t) => t.name === taskName);
  if (terminal !== undefined && terminal !== vscode.window.activeTerminal) {
    terminal.show(true);
    return true;
  }

  return false;
}

export async function runTask(task: vscode.Task): Promise<number | undefined> {
  if (task.definition.teamsfxTaskId === undefined) {
    task.definition.teamsfxTaskId = uuid.v4();
  }

  const taskId = task.definition.teamsfxTaskId;
  let started = false;

  return new Promise<number | undefined>((resolve, reject) => {
    // corner case but need to handle - somehow the task does not start
    const startTimer = setTimeout(() => {
      if (!started) {
        reject(new Error("Task start timeout"));
      }
    }, 30000);

    const startListener = taskStartEventEmitter.event((result) => {
      if (taskId === result) {
        clearTimeout(startTimer);
        started = true;
        startListener.dispose();
      }
    });

    vscode.tasks.executeTask(task);

    const endListener = taskEndEventEmitter.event((result) => {
      if (taskId === result.id) {
        endListener.dispose();
        resolve(result.exitCode);
      }
    });
  });
}

// TODO: move to local debug prerequisites checker
async function checkCustomizedPort(component: string, componentRoot: string, checklist: RegExp[]) {
  /*
  const devScript = await loadTeamsFxDevScript(componentRoot);
  if (devScript) {
    let showWarning = false;
    for (const check of checklist) {
      if (!check.test(devScript)) {
        showWarning = true;
        break;
      }
    }

    if (showWarning) {
      VsCodeLogInstance.info(`Customized port detected in ${component}.`);
      if (!globalStateGet(constants.PortWarningStateKeys.DoNotShowAgain, false)) {
        const doNotShowAgain = "Don't Show Again";
        const editPackageJson = "Edit package.json";
        const learnMore = "Learn More";
        vscode.window
          .showWarningMessage(
            util.format(
              StringResources.vsc.localDebug.portWarning,
              component,
              path.join(componentRoot, "package.json")
            ),
            doNotShowAgain,
            editPackageJson,
            learnMore
          )
          .then(async (selected) => {
            if (selected === doNotShowAgain) {
              await globalStateUpdate(constants.PortWarningStateKeys.DoNotShowAgain, true);
            } else if (selected === editPackageJson) {
              vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.file(path.join(componentRoot, "package.json"))
              );
            } else if (selected === learnMore) {
              vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.parse(constants.localDebugHelpDoc)
              );
            }
          });
      }
    }
  }
  */
}

function onDidStartTaskHandler(event: vscode.TaskStartEvent): void {
  const taskId = event.execution.task?.definition?.teamsfxTaskId;
  if (taskId !== undefined) {
    trackedTasks.set(taskId, event.execution.task.name);
    taskStartEventEmitter.fire(taskId as string);
  }
}

function onDidEndTaskHandler(event: vscode.TaskEndEvent): void {
  const taskId = event.execution.task?.definition?.teamsfxTaskId;
  if (taskId !== undefined && trackedTasks.has(taskId as string)) {
    trackedTasks.delete(taskId as string);
    taskEndEventEmitter.fire({
      id: taskId as string,
      name: event.execution.task.name,
      exitCode: undefined,
    });
  }
}

async function onDidStartTaskProcessHandler(event: vscode.TaskProcessStartEvent): Promise<void> {
  if (ext.workspaceUri && isValidProject(ext.workspaceUri.fsPath)) {
    const task = event.execution.task;
    if (task.scope !== undefined && isTeamsfxTask(task)) {
      allRunningTeamsfxTasks.set(getTaskKey(task), event.processId);
    } else if (isNpmInstallTask(task)) {
      try {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugNpmInstallStart, {
          [TelemetryProperty.DebugNpmInstallName]: task.name,
        });

        if (TreatmentVariableValue.isEmbeddedSurvey) {
          // Survey triggering point
          const survey = ExtensionSurvey.getInstance();
          survey.activate();
        }
      } catch {
        // ignore telemetry error
      }

      activeNpmInstallTasks.add(task.name);
    }
  }
}

async function onDidEndTaskProcessHandler(event: vscode.TaskProcessEndEvent): Promise<void> {
  const timestamp = new Date();
  const task = event.execution.task;
  const activeTerminal = vscode.window.activeTerminal;

  const taskId = task?.definition?.teamsfxTaskId;
  if (taskId !== undefined) {
    trackedTasks.delete(taskId as string);
    taskEndEventEmitter.fire({
      id: taskId as string,
      name: event.execution.task.name,
      exitCode: event.exitCode,
    });
  }

  if (task.scope !== undefined && isTeamsfxTask(task)) {
    allRunningTeamsfxTasks.delete(getTaskKey(task));
  } else if (isNpmInstallTask(task)) {
    try {
      activeNpmInstallTasks.delete(task.name);
      if (activeTerminal?.name === task.name && event.exitCode === 0) {
        // when the task in active terminal is ended successfully.
        for (const hiddenTaskName of activeNpmInstallTasks) {
          // display the first hidden terminal.
          if (displayTerminal(hiddenTaskName)) {
            return;
          }
        }
      } else if (activeTerminal?.name !== task.name && event.exitCode !== 0) {
        // when the task in hidden terminal failed to execute.
        displayTerminal(task.name);
      }

      const cwdOption = (task.execution as vscode.ShellExecution).options?.cwd;
      let cwd: string | undefined;
      if (cwdOption !== undefined) {
        cwd = cwdOption.replace("${workspaceFolder}", ext.workspaceUri.fsPath);
      }
      const npmInstallLogInfo = await getNpmInstallLogInfo();
      let validNpmInstallLogInfo = false;
      if (
        cwd !== undefined &&
        npmInstallLogInfo?.cwd !== undefined &&
        path.relative(npmInstallLogInfo.cwd, cwd).length === 0 &&
        event.exitCode !== undefined &&
        npmInstallLogInfo.exitCode === event.exitCode
      ) {
        const timeDiff = timestamp.getTime() - npmInstallLogInfo.timestamp.getTime();
        if (timeDiff >= 0 && timeDiff <= 20000) {
          validNpmInstallLogInfo = true;
        }
      }
      const properties: { [key: string]: string } = {
        [TelemetryProperty.DebugNpmInstallName]: task.name,
        [TelemetryProperty.DebugNpmInstallExitCode]: event.exitCode + "", // "undefined" or number value
      };
      if (validNpmInstallLogInfo) {
        properties[TelemetryProperty.DebugNpmInstallNodeVersion] =
          npmInstallLogInfo?.nodeVersion + ""; // "undefined" or string value
        properties[TelemetryProperty.DebugNpmInstallNpmVersion] =
          npmInstallLogInfo?.npmVersion + ""; // "undefined" or string value
        properties[TelemetryProperty.DebugNpmInstallErrorMessage] =
          npmInstallLogInfo?.errorMessage?.join("\n") + ""; // "undefined" or string value
      }
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugNpmInstall, properties);

      if (cwd !== undefined && event.exitCode !== undefined && event.exitCode !== 0) {
        let url: string;
        if (validNpmInstallLogInfo) {
          url = `${issueLink}title=new+bug+report: Task '${
            task.name
          }' failed&body=${issueTemplate}${errorDetail}${JSON.stringify(
            npmInstallLogInfo,
            undefined,
            4
          )}`;
        } else {
          url = issueChooseLink;
        }
        const issue = {
          title: StringResources.vsc.handlers.reportIssue,
          run: async (): Promise<void> => {
            vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
          },
        };
        vscode.window
          .showErrorMessage(
            util.format(
              StringResources.vsc.localDebug.npmInstallFailedHintMessage,
              task.name,
              task.name
            ),
            issue
          )
          .then(async (button) => {
            await button?.run();
          });
        await VsCodeLogInstance.error(
          util.format(
            StringResources.vsc.localDebug.npmInstallFailedHintMessage,
            task.name,
            task.name
          )
        );
        terminateAllRunningTeamsfxTasks();
      }
    } catch {
      // ignore any error
    }
  }
}

async function onDidStartDebugSessionHandler(event: vscode.DebugSession): Promise<void> {
  if (ext.workspaceUri && isValidProject(ext.workspaceUri.fsPath)) {
    const debugConfig = event.configuration as TeamsfxDebugConfiguration;
    if (
      debugConfig &&
      debugConfig.name &&
      (debugConfig.url || debugConfig.port) && // it's from launch.json
      !debugConfig.postRestartTask
    ) {
      // and not a restart one
      // send f5 event telemetry
      try {
        const localAppId = (await getLocalTeamsAppId()) as string;
        const isLocal =
          (debugConfig.url as string) &&
          localAppId &&
          (debugConfig.url as string).includes(localAppId);
        let appId = "";
        let env = "";
        if (isLocal) {
          appId = localAppId;
        } else {
          if (debugConfig.teamsfxAppId) {
            appId = debugConfig.teamsfxAppId;
          }
          if (debugConfig.teamsfxEnv) {
            env = getHashedEnv(event.configuration.env);
          }
        }

        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugStart, {
          [TelemetryProperty.DebugSessionId]: event.id,
          [TelemetryProperty.DebugType]: debugConfig.type,
          [TelemetryProperty.DebugRequest]: debugConfig.request,
          [TelemetryProperty.DebugPort]: debugConfig.port + "",
          [TelemetryProperty.DebugRemote]: isLocal ? "false" : "true",
          [TelemetryProperty.DebugAppId]: appId,
          [TelemetryProperty.Env]: env,
        });

        if (
          debugConfig.request === "launch" &&
          isLocal &&
          !globalStateGet(constants.SideloadingHintStateKeys.DoNotShowAgain, false)
        ) {
          vscode.window
            .showInformationMessage(
              StringResources.vsc.localDebug.sideloadingHintMessage,
              StringResources.vsc.localDebug.sideloadingHintDoNotShowAgain,
              StringResources.vsc.localDebug.openFAQ
            )
            .then(async (selected) => {
              if (selected === StringResources.vsc.localDebug.sideloadingHintDoNotShowAgain) {
                await globalStateUpdate(constants.SideloadingHintStateKeys.DoNotShowAgain, true);
              } else if (selected === StringResources.vsc.localDebug.openFAQ) {
                vscode.commands.executeCommand(
                  "vscode.open",
                  vscode.Uri.parse(constants.localDebugFAQUrl)
                );
              }
              ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugFAQ, {
                [TelemetryProperty.DebugFAQSelection]: selected + "",
                [TelemetryProperty.DebugAppId]: localAppId,
              });
            });
        }
      } catch {
        // ignore telemetry error
      }

      allRunningDebugSessions.add(event.id);
    }
  }
}

export function terminateAllRunningTeamsfxTasks(): void {
  for (const task of allRunningTeamsfxTasks) {
    try {
      process.kill(task[1], "SIGTERM");
    } catch (e) {
      // ignore and keep killing others
    }
  }
  allRunningTeamsfxTasks.clear();
}

function onDidTerminateDebugSessionHandler(event: vscode.DebugSession): void {
  if (allRunningDebugSessions.has(event.id)) {
    // a valid debug session
    // send stop-debug event telemetry
    try {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugStop, {
        [TelemetryProperty.DebugSessionId]: event.id,
      });
    } catch {
      // ignore telemetry error
    }

    const extConfig: vscode.WorkspaceConfiguration =
      vscode.workspace.getConfiguration("fx-extension");
    if (extConfig.get<boolean>("stopTeamsToolkitTasksPostDebug", true)) {
      terminateAllRunningTeamsfxTasks();
    }

    allRunningDebugSessions.delete(event.id);
    if (allRunningDebugSessions.size == 0) {
      endLocalDebugSession();
    }
    allRunningTeamsfxTasks.clear();
  }
}

export function registerTeamsfxTaskAndDebugEvents(): void {
  taskEndEventEmitter = new vscode.EventEmitter<{ id: string; name: string; exitCode?: number }>();
  taskStartEventEmitter = new vscode.EventEmitter<string>();
  ext.context.subscriptions.push({
    dispose() {
      taskEndEventEmitter.dispose();
      taskStartEventEmitter.dispose();
      trackedTasks.clear();
    },
  });

  ext.context.subscriptions.push(vscode.tasks.onDidStartTask(onDidStartTaskHandler));
  ext.context.subscriptions.push(vscode.tasks.onDidEndTask(onDidEndTaskHandler));

  ext.context.subscriptions.push(
    vscode.tasks.onDidStartTaskProcess((event: vscode.TaskProcessStartEvent) =>
      Correlator.runWithId(getLocalDebugSessionId(), onDidStartTaskProcessHandler, event)
    )
  );

  ext.context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((event: vscode.TaskProcessEndEvent) =>
      Correlator.runWithId(getLocalDebugSessionId(), onDidEndTaskProcessHandler, event)
    )
  );

  // debug session handler use correlation-id from event.configuration.teamsfxCorrelationId
  // to minimize concurrent debug session affecting correlation-id
  ext.context.subscriptions.push(
    vscode.debug.onDidStartDebugSession((event: vscode.DebugSession) =>
      Correlator.runWithId(
        // fallback to retrieve correlation id from the global variable.
        event.configuration.teamsfxCorrelationId || getLocalDebugSessionId(),
        onDidStartDebugSessionHandler,
        event
      )
    )
  );
  ext.context.subscriptions.push(
    vscode.debug.onDidTerminateDebugSession((event: vscode.DebugSession) =>
      Correlator.runWithId(
        event.configuration.teamsfxCorrelationId || getLocalDebugSessionId(),
        onDidTerminateDebugSessionHandler,
        event
      )
    )
  );
}
