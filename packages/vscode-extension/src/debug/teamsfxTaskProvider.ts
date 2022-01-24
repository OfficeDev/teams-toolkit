// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";

import * as constants from "./constants";
import * as commonUtils from "./commonUtils";
import { Json, ProductName, ProjectSettings, VsCodeEnv } from "@microsoft/teamsfx-api";
import { FolderName, LocalEnvManager } from "@microsoft/teamsfx-core";
import { VSCodeDepsChecker } from "./depsChecker/vscodeChecker";
import { vscodeLogger } from "./depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./depsChecker/vscodeTelemetry";
import VsCodeLogInstance from "../commonlib/log";
import { detectVsCodeEnv, showError } from "../handlers";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  NpmTaskDefinition,
  TaskDefinition,
  ITaskDefinition,
  DepsType,
} from "@microsoft/teamsfx-core";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";

export class TeamsfxTaskProvider implements vscode.TaskProvider {
  public static readonly type: string = ProductName;

  public async provideTasks(token?: vscode.CancellationToken | undefined): Promise<vscode.Task[]> {
    const tasks: vscode.Task[] = [];
    if (vscode.workspace.workspaceFolders) {
      const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
      const workspacePath: string = workspaceFolder.uri.fsPath;
      if (!(await commonUtils.isFxProject(workspacePath))) {
        return tasks;
      }

      const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
      let projectSettings: ProjectSettings;
      let localSettings: Json | undefined;
      let localEnv: { [key: string]: string } | undefined;

      try {
        projectSettings = await localEnvManager.getProjectSettings(workspacePath);
        localSettings = await localEnvManager.getLocalSettings(workspacePath, {
          projectId: projectSettings.projectId,
        });
        localEnv = await localEnvManager.getLocalDebugEnvs(
          workspacePath,
          projectSettings,
          localSettings
        );
      } catch (error: any) {
        showError(error);
        return tasks;
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
        if (programmingLanguage === ProgrammingLanguage.typescript) {
          tasks.push(await this.createBackendWatchTask(workspaceFolder));
        }
      }

      const authRoot = commonUtils.getAuthServicePath(localEnv);
      if (authRoot) {
        tasks.push(await this.createAuthStartTask(workspaceFolder, authRoot, localEnv));
      }

      const botRoot = await commonUtils.getProjectRoot(workspacePath, FolderName.Bot);
      if (botRoot) {
        const skipNgrok = (localSettings?.bot?.skipNgrok as boolean) === true;
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
    }
    return tasks;
  }

  public async resolveTask(
    task: vscode.Task,
    token?: vscode.CancellationToken | undefined
  ): Promise<vscode.Task | undefined> {
    // Resolve "dev" and "watch" tasks
    if (vscode.workspace.workspaceFolders) {
      const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
      const workspacePath: string = workspaceFolder.uri.fsPath;
      if (!(await commonUtils.isFxProject(workspacePath))) {
        VsCodeLogInstance.error(
          `No ${TeamsfxTaskProvider.type} project. Cannot resolve ${TeamsfxTaskProvider.type} task.`
        );
        return undefined;
      }

      const command: string | undefined = task.definition.command;
      if (!command || (command?.toLowerCase() !== "dev" && command?.toLowerCase() !== "watch")) {
        VsCodeLogInstance.error(
          `Missing or wrong 'command' field in ${TeamsfxTaskProvider.type} task.`
        );

        return undefined;
      }

      const component: string | undefined = task.definition.component;
      if (
        !component ||
        (component?.toLowerCase() !== "frontend" &&
          component?.toLowerCase() !== "backend" &&
          component?.toLowerCase() !== "bot")
      ) {
        VsCodeLogInstance.error(
          `Missing or wrong 'component' field in ${TeamsfxTaskProvider.type} task.`
        );
        return undefined;
      }

      if (
        task.scope !== undefined &&
        task.scope !== vscode.TaskScope.Global &&
        task.scope !== vscode.TaskScope.Workspace
      ) {
        let problemMatcher: string;
        const isWatchTask = command.toLowerCase() === "watch";
        let taskDefinition: ITaskDefinition | undefined = undefined;
        if (component?.toLowerCase() === "frontend") {
          taskDefinition = NpmTaskDefinition.frontend(workspacePath, isWatchTask);
          problemMatcher = isWatchTask
            ? constants.tscWatchProblemMatcher
            : constants.frontendProblemMatcher;
        } else if (component?.toLowerCase() === "backend") {
          problemMatcher = isWatchTask
            ? constants.tscWatchProblemMatcher
            : constants.backendProblemMatcher;

          // prepare PATH to execute `func`
          const depsChecker = new VSCodeDepsChecker(vscodeLogger, vscodeTelemetry);
          const funcCoreTools = await depsChecker.getDepsStatus(DepsType.FuncCoreTools);
          // const funcBinFolders = funcCoreTools.details.binFolders;
          taskDefinition = NpmTaskDefinition.backend(
            workspacePath,
            isWatchTask,
            funcCoreTools.details.binFolders
          );
        } else if (component?.toLowerCase() === "bot") {
          problemMatcher = isWatchTask
            ? constants.tscWatchProblemMatcher
            : constants.botProblemMatcher;
          taskDefinition = NpmTaskDefinition.bot(workspacePath, isWatchTask);
        } else {
          VsCodeLogInstance.error(
            `Missing or wrong 'component' field in ${TeamsfxTaskProvider.type} task.`
          );
          return undefined;
        }

        const resolvedTask = new vscode.Task(
          task.definition,
          task.scope,
          task.name,
          TeamsfxTaskProvider.type,
          new vscode.ShellExecution(taskDefinition.command, {
            cwd: taskDefinition.cwd,
            env: taskDefinition.env,
          }),
          problemMatcher
        );
        resolvedTask.isBackground = taskDefinition?.isBackground;
        return resolvedTask;
      } else {
        VsCodeLogInstance.error(`No task scope. Cannot resolve ${TeamsfxTaskProvider.type} task.`);
        return undefined;
      }
    } else {
      VsCodeLogInstance.error(
        `No workspace open. Cannot resolve ${TeamsfxTaskProvider.type} task.`
      );
      return undefined;
    }
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
      problemMatchers || constants.frontendProblemMatcher,
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
