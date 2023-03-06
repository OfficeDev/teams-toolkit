// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import {
  assembleError,
  err,
  FxError,
  Json,
  ok,
  ProductName,
  ProjectSettings,
  Result,
  Stage,
  v2,
  VsCodeEnv,
} from "@microsoft/teamsfx-api";
import { isV3Enabled, ProgrammingLanguage, TunnelType } from "@microsoft/teamsfx-core";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import { DepsType } from "@microsoft/teamsfx-core/build/common/deps-checker";
import {
  FolderName,
  ITaskDefinition,
  LocalEnvManager,
  TaskCommand,
  TaskDefinition,
} from "@microsoft/teamsfx-core/build/common/local";
import {
  isValidProject,
  isValidProjectV3,
} from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";

import VsCodeLogInstance from "../commonlib/log";
import { detectVsCodeEnv, showError } from "../handlers";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as commonUtils from "./commonUtils";
import * as constants from "./constants";
import { VSCodeDepsChecker } from "./depsChecker/vscodeChecker";
import { vscodeHelper } from "./depsChecker/vscodeHelper";
import { vscodeLogger } from "./depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./depsChecker/vscodeTelemetry";
import { localTelemetryReporter } from "./localTelemetryReporter";
import { LifecycleTaskTerminal } from "./taskTerminal/lifecycleTaskTerminal";
import { NgrokTunnelTaskTerminal } from "./taskTerminal/ngrokTunnelTaskTerminal";
import { NpmInstallTaskTerminal } from "./taskTerminal/npmInstallTaskTerminal";
import { PrepareManifestTaskTerminal } from "./taskTerminal/prepareManifestTaskTerminal";
import { PrerequisiteTaskTerminal } from "./taskTerminal/prerequisiteTaskTerminal";
import { SetUpBotTaskTerminal } from "./taskTerminal/setUpBotTaskTerminal";
import { SetUpSSOTaskTerminal } from "./taskTerminal/setUpSSOTaskTerminal";
import { SetUpTabTaskTerminal } from "./taskTerminal/setUpTabTaskTerminal";
import * as globalVariables from "../globalVariables";
import { DevTunnelTaskTerminal } from "./taskTerminal/devTunnelTaskTerminal";
import { LaunchTeamsClientTerminal } from "./taskTerminal/launchTeamsClientTerminal";

const customTasks = Object.freeze({
  [TaskCommand.checkPrerequisites]: {
    createTerminal: async (d: vscode.TaskDefinition) => new PrerequisiteTaskTerminal(d),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
  [TaskCommand.npmInstall]: {
    createTerminal: async (d: vscode.TaskDefinition) => new NpmInstallTaskTerminal(d),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
  [TaskCommand.startLocalTunnel]: {
    createTerminal: async (d: vscode.TaskDefinition) => {
      if (d?.args?.type === TunnelType.ngrok || typeof d?.args?.type === "undefined") {
        return new NgrokTunnelTaskTerminal(d);
      } else {
        // If the value of type is not TunnelType.ngrok / TunnelType.devTunnel, resolveArgs in the BaseTunnelTaskTerminal will throw error.
        return new DevTunnelTaskTerminal(d);
      }
    },
    presentationReveal: vscode.TaskRevealKind.Silent,
    presentationEcho: true,
    presentationshowReuseMessage: true,
  },
  [TaskCommand.setUpTab]: {
    createTerminal: async (d: vscode.TaskDefinition) => new SetUpTabTaskTerminal(d),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
  [TaskCommand.setUpBot]: {
    createTerminal: async (d: vscode.TaskDefinition) => new SetUpBotTaskTerminal(d),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
  [TaskCommand.setUpSSO]: {
    createTerminal: async (d: vscode.TaskDefinition) => new SetUpSSOTaskTerminal(d),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
  [TaskCommand.prepareManifest]: {
    createTerminal: async (d: vscode.TaskDefinition) => new PrepareManifestTaskTerminal(d),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
  [TaskCommand.launchWebClient]: {
    createTerminal: async (d: vscode.TaskDefinition) => new LaunchTeamsClientTerminal(d),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
  [TaskCommand.provision]: {
    createTerminal: async (d: vscode.TaskDefinition) =>
      new LifecycleTaskTerminal(d, Stage.provision),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
  [TaskCommand.deploy]: {
    createTerminal: async (d: vscode.TaskDefinition) => new LifecycleTaskTerminal(d, Stage.deploy),
    presentationReveal: vscode.TaskRevealKind.Never,
    presentationEcho: false,
    presentationshowReuseMessage: false,
  },
});

export class TeamsfxTaskProvider implements vscode.TaskProvider {
  public static readonly type: string = ProductName;

  public provideTasks(token?: vscode.CancellationToken | undefined): Promise<vscode.Task[]> {
    return Correlator.runWithId(
      commonUtils.getLocalDebugSessionId(),
      async (): Promise<vscode.Task[]> => {
        const tasks: vscode.Task[] = [];
        if (commonUtils.getLocalDebugSessionId() === commonUtils.DebugNoSessionId) {
          await this._provideTasks(tasks, token);
        } else {
          // Only send telemetry within a local debug session.
          await localTelemetryReporter.runWithTelemetry(TelemetryEvent.DebugTaskProvider, () =>
            this._provideTasks(tasks, token)
          );

          // Currently do not send end event if task provider failed.
          // The reason:
          // If task provider fails (only for ngrok task),
          // vscode will continue to run "prepare local environment" task (after a long timeout).
          // "prepare local environment" will fail when checking ngrok.
          // The "debug-all" event will be sent in "pre-debug-check" command.
        }
        return tasks;
      }
    );
  }

  private async _provideTasks(
    tasks: vscode.Task[],
    token?: vscode.CancellationToken | undefined
  ): Promise<Result<void, FxError>> {
    if (vscode.workspace.workspaceFolders) {
      const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
      const workspacePath: string = workspaceFolder.uri.fsPath;

      if (!isValidProject(workspacePath)) {
        return ok(undefined);
      }

      // migrate to v3
      if (isV3Enabled()) {
        await commonUtils.triggerV3Migration();
        return ok(undefined);
      }

      const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
      let projectSettings: ProjectSettings;
      let localSettings: Json | undefined;
      let localEnvInfo: v2.EnvInfoV2 | undefined;
      let localEnv: { [key: string]: string } | undefined;

      try {
        projectSettings = await localEnvManager.getProjectSettings(workspacePath);
        localSettings = await localEnvManager.getLocalSettings(workspacePath, {
          projectId: projectSettings.projectId,
        });
        localEnvInfo = await localEnvManager.getLocalEnvInfo(workspacePath, {
          projectId: projectSettings.projectId,
        });
        localEnv = await localEnvManager.getLocalDebugEnvs(
          workspacePath,
          projectSettings,
          localSettings,
          localEnvInfo
        );
      } catch (error: unknown) {
        const fxError = assembleError(error);
        showError(fxError);
        return err(fxError);
      }

      const programmingLanguage = projectSettings?.programmingLanguage;

      // Always provide the following tasks no matter whether it is defined in tasks.json
      const frontendRoot = await commonUtils.getProjectRoot(workspacePath, FolderName.Frontend);
      if (frontendRoot) {
        tasks.push(await this.createFrontendStartTask(workspaceFolder, localEnv));
      }

      const backendRoot = await commonUtils.getProjectRoot(workspacePath, FolderName.Function);
      if (backendRoot) {
        tasks.push(
          await this.createBackendStartTask(workspaceFolder, programmingLanguage, localEnv)
        );
        if (programmingLanguage === ProgrammingLanguage.TS) {
          tasks.push(await this.createBackendWatchTask(workspaceFolder));
        }
      }

      const authRoot = commonUtils.getAuthServicePath(localEnv);
      if (authRoot) {
        tasks.push(await this.createAuthStartTask(workspaceFolder, authRoot, localEnv));
      }

      const botRoot = await commonUtils.getProjectRoot(workspacePath, FolderName.Bot);
      if (botRoot) {
        const skipNgrok = !vscodeHelper.isNgrokCheckerEnabled();
        tasks.push(await this.createNgrokStartTask(workspaceFolder, botRoot, skipNgrok));
        const silent: boolean = frontendRoot !== undefined;
        tasks.push(
          await this.createBotStartTask(workspaceFolder, programmingLanguage, localEnv, silent)
        );
      }

      const vscodeEnv = detectVsCodeEnv();
      const isCodeSpaceEnv =
        vscodeEnv === VsCodeEnv.codespaceBrowser || vscodeEnv === VsCodeEnv.codespaceVsCode;
      if (isCodeSpaceEnv) {
        const localTeamsAppId = localSettings?.teamsApp?.teamsAppId as string;
        const debugConfig = { appId: localTeamsAppId };
        tasks.push(await this.createOpenTeamsWebClientTask(workspaceFolder, debugConfig));
      }

      return ok(undefined);
    }

    return ok(undefined);
  }

  public async resolveTask(
    task: vscode.Task,
    token?: vscode.CancellationToken | undefined
  ): Promise<vscode.Task | undefined> {
    if (task.definition.type !== TeamsfxTaskProvider.type || !task.definition.command) {
      return undefined;
    }

    const customTask = Object.entries(customTasks).find(
      ([k]) => k === task.definition.command
    )?.[1];
    if (!customTask) {
      return undefined;
    }

    // migrate to v3
    if (isV3Enabled()) {
      let needsMigration = false;
      if (task.definition.command === TaskCommand.checkPrerequisites) {
        if (!isValidProjectV3(globalVariables.workspaceUri!.fsPath)) {
          needsMigration = true;
        }
      } else if (
        task.definition.command === TaskCommand.npmInstall ||
        task.definition.command === TaskCommand.setUpTab ||
        task.definition.command === TaskCommand.setUpBot ||
        task.definition.command === TaskCommand.setUpSSO ||
        task.definition.command === TaskCommand.prepareManifest
      ) {
        needsMigration = true;
      }

      if (needsMigration) {
        // if returning undefined, vscode will resolve the task from task provider and migration will be triggered then
        return undefined;
      }
    }

    const newTask = new vscode.Task(
      task.definition,
      vscode.TaskScope.Workspace,
      task.name,
      TeamsfxTaskProvider.type,
      new vscode.CustomExecution(customTask.createTerminal)
    );

    newTask.presentationOptions.reveal = customTask.presentationReveal;
    newTask.presentationOptions.echo = customTask.presentationEcho;
    newTask.presentationOptions.showReuseMessage = customTask.presentationshowReuseMessage;
    return newTask;
  }

  private async createFrontendStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    localEnv: { [key: string]: string } | undefined,
    definition?: vscode.TaskDefinition,
    problemMatchers?: string | string[]
  ): Promise<vscode.Task> {
    return createTask(
      TaskDefinition.frontendStart(workspaceFolder.uri.fsPath),
      workspaceFolder,
      commonUtils.getFrontendLocalEnv(localEnv),
      definition,
      problemMatchers || constants.frontendProblemMatcher
    );
  }

  private async createBackendStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    programmingLanguage: string | undefined,
    localEnv: { [key: string]: string } | undefined,
    definition?: vscode.TaskDefinition,
    problemMatchers?: string | string[]
  ): Promise<vscode.Task> {
    const depsChecker = new VSCodeDepsChecker(vscodeLogger, vscodeTelemetry);
    const funcCoreTools = await depsChecker.getDepsStatus(DepsType.FuncCoreTools);

    return createTask(
      TaskDefinition.backendStart(
        workspaceFolder.uri.fsPath,
        programmingLanguage,
        funcCoreTools.command,
        true
      ),
      workspaceFolder,
      commonUtils.getBackendLocalEnv(localEnv),
      definition,
      problemMatchers || constants.backendProblemMatcher,
      true
    );
  }

  private async createAuthStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    authRoot: string,
    localEnv: { [key: string]: string } | undefined,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const depsChecker = new VSCodeDepsChecker(vscodeLogger, vscodeTelemetry);
    const dotnet = await depsChecker.getDepsStatus(DepsType.Dotnet);
    return createTask(
      TaskDefinition.authStart(dotnet.command, authRoot),
      workspaceFolder,
      commonUtils.getAuthLocalEnv(localEnv),
      definition,
      constants.authProblemMatcher,
      true
    );
  }

  private async createNgrokStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    isSkipped: boolean,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    // prepare PATH to execute `ngrok`
    const depsChecker = new VSCodeDepsChecker(vscodeLogger, vscodeTelemetry);
    const ngrok = await depsChecker.getDepsStatus(DepsType.Ngrok);
    return createTask(
      TaskDefinition.ngrokStart(workspaceFolder.uri.fsPath, isSkipped, ngrok.details.binFolders),
      workspaceFolder,
      undefined,
      definition,
      constants.ngrokProblemMatcher
    );
  }

  private async createBotStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    programmingLanguage: string | undefined,
    localEnv: { [key: string]: string } | undefined,
    silent: boolean,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    return createTask(
      TaskDefinition.botStart(workspaceFolder.uri.fsPath, programmingLanguage, true),
      workspaceFolder,
      commonUtils.getBotLocalEnv(localEnv),
      definition,
      constants.botProblemMatcher,
      silent
    );
  }

  private async createOpenTeamsWebClientTask(
    workspaceFolder: vscode.WorkspaceFolder,
    debugConfig: any,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.openWenClientCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };

    const localTeamsAppId: string | undefined = debugConfig?.appId;
    const commandLine = `npx open-cli https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true`;

    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ShellExecution(commandLine)
    );

    return task;
  }

  private async createBackendWatchTask(
    workspaceFolder: vscode.WorkspaceFolder,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    return createTask(
      TaskDefinition.backendWatch(workspaceFolder.uri.fsPath),
      workspaceFolder,
      undefined,
      definition,
      constants.tscWatchProblemMatcher,
      true
    );
  }
}

export async function createTask(
  taskDefinition: ITaskDefinition,
  workspaceFolder: vscode.WorkspaceFolder,
  env?: { [key: string]: string } | undefined,
  definition?: vscode.TaskDefinition,
  problemMatchers?: string | string[],
  isSilent?: boolean
): Promise<vscode.Task> {
  definition = definition || {
    type: TeamsfxTaskProvider.type,
    command: taskDefinition.name,
  };

  const options: vscode.ShellExecutionOptions = {
    cwd: taskDefinition.cwd,
    env: env ?? taskDefinition.env,
    // avoid powershell execution policy issue
    executable: taskDefinition.execOptions.needCmd ? "cmd.exe" : undefined,
    shellArgs: taskDefinition.execOptions.needCmd ? ["/c"] : undefined,
  };

  const execution = taskDefinition.execOptions.needShell
    ? new vscode.ShellExecution(taskDefinition.command, options)
    : new vscode.ProcessExecution(taskDefinition.command, taskDefinition.args ?? [], options);

  const task = new vscode.Task(
    definition,
    workspaceFolder,
    taskDefinition.name,
    TeamsfxTaskProvider.type,
    execution,
    problemMatchers
  );
  task.isBackground = taskDefinition.isBackground;
  if (isSilent) {
    task.presentationOptions.reveal = vscode.TaskRevealKind.Silent;
  }
  return task;
}
