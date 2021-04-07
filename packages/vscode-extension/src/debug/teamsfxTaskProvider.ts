// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import * as constants from "./constants";
import * as commonUtils from "./commonUtils";
import { DotnetChecker } from "./dotnetSdk/dotnetChecker";
import { dotnetCheckerEnabled } from "./dotnetSdk/dotnetCheckerAdapter";

export class TeamsfxTaskProvider implements vscode.TaskProvider {
  public static readonly type: string = constants.teamsfx;

  public async provideTasks(token?: vscode.CancellationToken | undefined): Promise<vscode.Task[]> {
    const tasks: vscode.Task[] = [];
    if (vscode.workspace.workspaceFolders) {
      const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
      const workspacePath: string = workspaceFolder.uri.fsPath;
      if (!(await commonUtils.isModsProject(workspacePath))) {
        return tasks;
      }

      // Always provide the following tasks no matter whether it is defined in tasks.json
      const frontendRoot = await commonUtils.getProjectRoot(
        workspacePath,
        constants.frontendFolderName
      );
      if (frontendRoot) {
        tasks.push(await this.createFrontendStartTask(workspaceFolder, frontendRoot));
      }

      const backendRoot = await commonUtils.getProjectRoot(
        workspacePath,
        constants.backendFolderName
      );
      if (backendRoot) {
        tasks.push(await this.createBackendStartTask(workspaceFolder, backendRoot));
      }

      const authRoot = await commonUtils.getAuthServicePath();
      if (authRoot) {
        tasks.push(await this.createAuthStartTask(workspaceFolder, authRoot));
      }

      const botRoot = await commonUtils.getProjectRoot(workspacePath, constants.botFolderName);
      if (botRoot) {
        tasks.push(await this.createNgrokStartTask(workspaceFolder));
        tasks.push(await this.createBotStartTask(workspaceFolder, botRoot));
      }
    }
    return tasks;
  }

  public async resolveTask(
    task: vscode.Task,
    token?: vscode.CancellationToken | undefined
  ): Promise<vscode.Task | undefined> {
    // Return undefined since all tasks are provided and fully resolved
    return undefined;
  }

  private async createFrontendStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    definition?: vscode.TaskDefinition,
    problemMatchers?: string | string[]
  ): Promise<vscode.Task> {
    const command: string = constants.frontendStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    const commandLine = "npx react-scripts start";
    const env = await commonUtils.getFrontendLocalEnv();
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
      env
    };
    problemMatchers = problemMatchers || constants.frontendProblemMatcher;
    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ShellExecution(commandLine, options),
      problemMatchers
    );
    task.isBackground = true;
    return task;
  }

  private async createBackendStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    definition?: vscode.TaskDefinition,
    problemMatchers?: string | string[]
  ): Promise<vscode.Task> {
    const command: string = constants.backendStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    // NOTE: properly handle quoting and escaping to work on windows (both powershell and cmd), linux and osx
    const commandLine =
      "func start --javascript --language-worker=\"--inspect=9229\" --port \"7071\" --cors \"*\"";
    const env = await commonUtils.getBackendLocalEnv();
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
      env
    };
    problemMatchers = problemMatchers || constants.backendProblemMatcher;
    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ShellExecution(commandLine, options),
      problemMatchers
    );
    task.isBackground = true;
    return task;
  }

  private async createAuthStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.authStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };

    // TODO: error handling when getDotnetExecPath() returns null
    // NOTE(aochengwang): We must pass empty string instead of null to vscode.ProcessExecution(),
    //   otherwise, VS Code will be stuck when F5.
    let dotnetPath;
    if (dotnetCheckerEnabled()) {
      dotnetPath = (await DotnetChecker.getDotnetExecPath()) || "";
    } else {
      dotnetPath = "dotnet";
    }

    const env = await commonUtils.getAuthLocalEnv();
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
      env
    };
    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ProcessExecution(dotnetPath, ["Microsoft.TeamsRuntimeConnector.dll"], options),
      constants.authProblemMatcher
    );
    task.isBackground = true;
    task.presentationOptions.reveal = vscode.TaskRevealKind.Silent;
    return task;
  }

  private async createNgrokStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.ngrokStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    const commandLine = "npx ngrok http 3978";
    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ShellExecution(commandLine),
      constants.ngrokProblemMatcher
    );
    task.isBackground = true;
    return task;
  }

  private async createBotStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.botStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    const commandLine = "nodemon index.js";
    const env = await commonUtils.getBotLocalEnv();
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
      env
    };
    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ShellExecution(commandLine, options),
      constants.botProblemMatcher
    );
    task.isBackground = true;
    return task;
  }
}
