// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import * as constants from "./constants";
import * as commonUtils from "./commonUtils";
import { ProductName, VsCodeEnv } from "@microsoft/teamsfx-api";
import { DotnetChecker } from "./depsChecker/dotnetChecker";
import { FuncToolChecker } from "./depsChecker/funcToolChecker";
import { detectVsCodeEnv } from "../handlers";
import { vscodeAdapter } from "./depsChecker/vscodeAdapter";
import { vscodeLogger } from "./depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./depsChecker/vscodeTelemetry";

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

      const programmingLanguage = await commonUtils.getProgrammingLanguage();

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
        tasks.push(
          await this.createBackendStartTask(workspaceFolder, backendRoot, programmingLanguage)
        );
        if (programmingLanguage === constants.ProgrammingLanguage.typescript) {
          tasks.push(await this.createBackendWatchTask(workspaceFolder, backendRoot));
        }
      }

      const authRoot = await commonUtils.getAuthServicePath();
      if (authRoot) {
        tasks.push(await this.createAuthStartTask(workspaceFolder, authRoot));
      }

      const botRoot = await commonUtils.getProjectRoot(workspacePath, constants.botFolderName);
      if (botRoot) {
        tasks.push(await this.createNgrokStartTask(workspaceFolder, botRoot));
        const silent: boolean = frontendRoot !== undefined;
        tasks.push(
          await this.createBotStartTask(workspaceFolder, botRoot, programmingLanguage, silent)
        );
      }

      const vscodeEnv = detectVsCodeEnv();
      const isCodeSpaceEnv =
        vscodeEnv === VsCodeEnv.codespaceBrowser || vscodeEnv === VsCodeEnv.codespaceVsCode;
      if (isCodeSpaceEnv) {
        tasks.push(await this.createOpenTeamsWebClientTask(workspaceFolder));
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
      env,
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
    programmingLanguage: string | undefined,
    definition?: vscode.TaskDefinition,
    problemMatchers?: string | string[]
  ): Promise<vscode.Task> {
    const command: string = constants.backendStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };

    // NOTE: properly handle quoting and escaping to work on windows (both powershell and cmd), linux and osx
    const funcChecker = new FuncToolChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
    const funcExecPath: string  = await funcChecker.getFuncExecPath();
    const commandLine =
      programmingLanguage === constants.ProgrammingLanguage.typescript
        ? `${funcExecPath} start --typescript --language-worker="--inspect=9229" --port "7071" --cors "*"`
        : `${funcExecPath} start --javascript --language-worker="--inspect=9229" --port "7071" --cors "*"`;
    const env = await commonUtils.getBackendLocalEnv();
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
      env,
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
    task.presentationOptions.reveal = vscode.TaskRevealKind.Silent;
    return task;
  }

  private async createAuthStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.authStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };

    const dotnetChecker = new DotnetChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
    const dotnetPath = await dotnetChecker.getDotnetExecPath();

    const env = await commonUtils.getAuthLocalEnv();
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
      env,
    };
    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ProcessExecution(dotnetPath, ["Microsoft.TeamsFx.SimpleAuth.dll"], options),
      constants.authProblemMatcher
    );
    task.isBackground = true;
    task.presentationOptions.reveal = vscode.TaskRevealKind.Silent;
    return task;
  }

  private async createNgrokStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.ngrokStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    let commandLine = "npx ngrok http 3978 --log=stdout";
    const skipNgrokConfig = await commonUtils.getSkipNgrokConfig();
    const skipNgrok = skipNgrokConfig && skipNgrokConfig.trim().toLocaleLowerCase() === "true";
    if (skipNgrok) {
      commandLine = "echo 'Do not start ngrok, but use predefined bot endpoint.'";
    }
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
    };
    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ShellExecution(commandLine, options),
      constants.ngrokProblemMatcher
    );
    task.isBackground = !skipNgrok;
    return task;
  }

  private async createBotStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    programmingLanguage: string | undefined,
    silent: boolean,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.botStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    // TODO: tell nodemon which files to watch (depends on bot's decision)
    const commandLine =
      programmingLanguage === constants.ProgrammingLanguage.typescript
        ? "npx nodemon --exec node --inspect=9239 --signal SIGINT -r ts-node/register index.ts"
        : "npx nodemon --inspect=9239 --signal SIGINT index.js";
    const env = await commonUtils.getBotLocalEnv();
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
      env,
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
    if (silent) {
      task.presentationOptions.reveal = vscode.TaskRevealKind.Silent;
    }
    return task;
  }

  private async createOpenTeamsWebClientTask(
    workspaceFolder: vscode.WorkspaceFolder,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.openWenClientCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };

    const localTeamsAppId: string | undefined = await commonUtils.getLocalDebugTeamsAppId(true);
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
    projectRoot: string,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.backendWatchCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    const commandLine = "npx tsc --watch"; // TODO: tell tsc which files to watch (depends on function's decision)
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
    };
    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ShellExecution(commandLine, options),
      constants.tscWatchProblemMatcher
    );
    task.isBackground = true;
    task.presentationOptions.reveal = vscode.TaskRevealKind.Silent;
    return task;
  }
}
