// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";

import * as constants from "./constants";
import * as commonUtils from "./commonUtils";
import { Json, ProductName, ProjectSettings, VsCodeEnv } from "@microsoft/teamsfx-api";
import { LocalEnvManager } from "@microsoft/teamsfx-core";
import { DotnetChecker } from "./depsChecker/dotnetChecker";
import { FuncToolChecker } from "./depsChecker/funcToolChecker";
import { NgrokChecker } from "./depsChecker/ngrokChecker";
import VsCodeLogInstance from "../commonlib/log";
import { detectVsCodeEnv, showError } from "../handlers";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { vscodeAdapter } from "./depsChecker/vscodeAdapter";
import { vscodeLogger } from "./depsChecker/vscodeLogger";
import { vscodeTelemetry } from "./depsChecker/vscodeTelemetry";
import { isWindows } from "../utils/commonUtils";

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
      const frontendRoot = await commonUtils.getProjectRoot(
        workspacePath,
        constants.frontendFolderName
      );
      if (frontendRoot) {
        tasks.push(await this.createFrontendStartTask(workspaceFolder, frontendRoot, localEnv));
      }

      const backendRoot = await commonUtils.getProjectRoot(
        workspacePath,
        constants.backendFolderName
      );
      if (backendRoot) {
        tasks.push(
          await this.createBackendStartTask(
            workspaceFolder,
            backendRoot,
            programmingLanguage,
            localEnv
          )
        );
        if (programmingLanguage === constants.ProgrammingLanguage.typescript) {
          tasks.push(await this.createBackendWatchTask(workspaceFolder, backendRoot));
        }
      }

      const authRoot = commonUtils.getAuthServicePath(localEnv);
      if (authRoot) {
        tasks.push(await this.createAuthStartTask(workspaceFolder, authRoot, localEnv));
      }

      const botRoot = await commonUtils.getProjectRoot(workspacePath, constants.botFolderName);
      if (botRoot) {
        const skipNgrok = (localSettings?.bot?.skipNgrok as boolean) === true;
        tasks.push(await this.createNgrokStartTask(workspaceFolder, botRoot, skipNgrok));
        const silent: boolean = frontendRoot !== undefined;
        tasks.push(
          await this.createBotStartTask(
            workspaceFolder,
            botRoot,
            programmingLanguage,
            localEnv,
            silent
          )
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
        let env: { [key: string]: string } | undefined = undefined;
        let cwd: string | undefined;
        let problemMatcher: string;
        const isWatchTask = command.toLowerCase() === "watch";
        const shellCmd = isWatchTask ? "npm run watch:teamsfx" : "npm run dev:teamsfx";
        if (component?.toLowerCase() === "frontend") {
          cwd = await commonUtils.getProjectRoot(workspacePath, constants.frontendFolderName);
          problemMatcher = isWatchTask
            ? constants.tscWatchProblemMatcher
            : constants.frontendProblemMatcher;
        } else if (component?.toLowerCase() === "backend") {
          cwd = await commonUtils.getProjectRoot(workspacePath, constants.backendFolderName);
          problemMatcher = isWatchTask
            ? constants.tscWatchProblemMatcher
            : constants.backendProblemMatcher;

          // prepare PATH to execute `func`
          const funcChecker = new FuncToolChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
          if ((await funcChecker.isEnabled()) && (await funcChecker.isPortableFuncInstalled())) {
            const funcBinFolders = funcChecker.getPortableFuncBinFolders();
            env = {
              // put portable func at the end since func checker prefers global func
              PATH: `${process.env.PATH ?? ""}${path.delimiter}${funcBinFolders.join(
                path.delimiter
              )}`,
            };
          }
        } else if (component?.toLowerCase() === "bot") {
          cwd = await commonUtils.getProjectRoot(workspacePath, constants.botFolderName);
          problemMatcher = isWatchTask
            ? constants.tscWatchProblemMatcher
            : constants.botProblemMatcher;
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
          new vscode.ShellExecution(shellCmd, { cwd: cwd, env: env }),
          problemMatcher
        );
        resolvedTask.isBackground = true;
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
    projectRoot: string,
    localEnv: { [key: string]: string } | undefined,
    definition?: vscode.TaskDefinition,
    problemMatchers?: string | string[]
  ): Promise<vscode.Task> {
    const command: string = constants.frontendStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    const commandLine = "npx react-scripts start";
    const env = commonUtils.getFrontendLocalEnv(localEnv);
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
    localEnv: { [key: string]: string } | undefined,
    definition?: vscode.TaskDefinition,
    problemMatchers?: string | string[]
  ): Promise<vscode.Task> {
    const command: string = constants.backendStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };

    // NOTE: properly handle quoting and escaping to work on windows (both powershell and cmd), linux and osx
    const args =
      programmingLanguage === constants.ProgrammingLanguage.typescript
        ? `start --typescript --language-worker="--inspect=9229" --port "7071" --cors "*"`
        : `start --javascript --language-worker="--inspect=9229" --port "7071" --cors "*"`;
    const funcChecker = new FuncToolChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
    const commandLine = `${await funcChecker.getFuncCommand()} ${args}`;

    const env = commonUtils.getBackendLocalEnv(localEnv);
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
      // avoid powershell execution policy issue
      executable: isWindows() ? "cmd.exe" : undefined,
      shellArgs: isWindows() ? ["/c"] : undefined,
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
    localEnv: { [key: string]: string } | undefined,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.authStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };

    const dotnetChecker = new DotnetChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
    const dotnetPath = await dotnetChecker.getDotnetExecPath();

    const env = commonUtils.getAuthLocalEnv(localEnv);
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
    isSkipped: boolean,
    definition?: vscode.TaskDefinition
  ): Promise<vscode.Task> {
    const command: string = constants.ngrokStartCommand;
    definition = definition || { type: TeamsfxTaskProvider.type, command };
    let commandLine = "npx ngrok http 3978 --log=stdout";
    if (isSkipped) {
      commandLine = "echo 'Do not start ngrok, but use predefined bot endpoint.'";
    }
    const options: vscode.ShellExecutionOptions = {
      cwd: projectRoot,
    };

    // prepare PATH to execute `ngrok`
    const ngrokChecker = new NgrokChecker(vscodeAdapter, vscodeLogger, vscodeTelemetry);
    options.env = {
      PATH: `${ngrokChecker.getNgrokBinFolder()}${path.delimiter}${process.env.PATH ?? ""}`,
    };

    const task = new vscode.Task(
      definition,
      workspaceFolder,
      command,
      TeamsfxTaskProvider.type,
      new vscode.ShellExecution(commandLine, options),
      constants.ngrokProblemMatcher
    );
    task.isBackground = !isSkipped;
    return task;
  }

  private async createBotStartTask(
    workspaceFolder: vscode.WorkspaceFolder,
    projectRoot: string,
    programmingLanguage: string | undefined,
    localEnv: { [key: string]: string } | undefined,
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
    const env = commonUtils.getBotLocalEnv(localEnv);
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
