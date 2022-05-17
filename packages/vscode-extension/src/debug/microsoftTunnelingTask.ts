// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import {
  ProductName,
  ProjectSettings,
  LogProvider,
  LogLevel,
  Colors,
  FxError,
  Result,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  loadTunnelInfo,
  TunnelHostResult,
  getTunnelPorts,
  storeTunnelInfo,
  MicrosoftTunnelingManager,
} from "@microsoft/teamsfx-core";
import * as constants from "./constants";
import appStudioLogin from "../commonlib/appStudioLogin";

const TunnelUpMessage = `The tunnel is up and running.`;
const TunnelFailMessage = `The tunnel failed to start.`;

// TODO: extract string constants to package.nls.json
export class MicrosoftTunnelingTaskTerminal implements vscode.Pseudoterminal {
  static readonly ExitCodeSuccess = 0;
  static readonly ExitCodeFailure = 1;

  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  onDidClose?: vscode.Event<number> = this.closeEmitter.event;

  private logger: PseudoterminalLogProvider;
  private manager?: MicrosoftTunnelingManager;

  constructor(private projectSettings: ProjectSettings, private projectPath: string) {
    this.logger = new PseudoterminalLogProvider(this.writeEmitter);
  }

  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    this.runWithErrorHandling(() => this.openAsync());
  }

  close(): void {
    this.runWithErrorHandling(() => this.closeAsync());
  }

  private async runWithErrorHandling(
    callback: () => Promise<Result<void, FxError>>
  ): Promise<void> {
    const fail = async (error: unknown) => {
      await this.logger.error(`${TunnelFailMessage} ${error}`);
      this.closeEmitter.fire(MicrosoftTunnelingTaskTerminal.ExitCodeFailure);
    };

    try {
      const result = await callback();
      if (result.isErr()) {
        await fail(result.error);
      }
    } catch (error) {
      await fail(error);
    }
  }

  private async openAsync(): Promise<Result<void, FxError>> {
    // TODO: add telemetry
    // TODO: prevent re-entry (cases when user manually trigger a task)
    this.manager = new MicrosoftTunnelingManager(async () => {
      // TODO: switch to new login and pass in Basis scopes
      const token = await appStudioLogin.getAccessToken();
      if (!token) {
        throw new Error("No login");
      }
      return token;
    });
    const tunnelInfoResult = await loadTunnelInfo(this.projectPath, this.projectSettings.projectId);
    if (tunnelInfoResult.isErr()) {
      return err(tunnelInfoResult.error);
    }
    const tunnelInfo = tunnelInfoResult.value;
    const ports = await getTunnelPorts(this.projectSettings);

    const info = await this.manager.startTunnelHost(ports, tunnelInfo, this.logger);
    await storeTunnelInfo(this.projectPath, this.projectSettings.projectId, info.tunnelInfo);
    this.printTunnelInfo(info);

    // For problem matcher
    this.logger.info(TunnelUpMessage);
    return ok(undefined);
  }

  private async closeAsync(): Promise<Result<void, FxError>> {
    // TODO: add telemetry
    await this.manager?.stopTunnelHost();
    return ok(undefined);
  }

  private printTunnelInfo(tunnelHostResult: TunnelHostResult) {
    this.logger.info(
      `Tunnel info: clusterId: ${tunnelHostResult.tunnelInfo.tunnelClusterId}, tunnelId: ${tunnelHostResult.tunnelInfo.tunnelId}`
    );
    this.logger.info("Port mappings:");
    for (const [portNumber, endpoint] of tunnelHostResult.portEndpoints.entries()) {
      this.logger.info(`  ${endpoint} => http://localhost:${portNumber}`);
    }
  }
}

export function createMicrosoftTunnelingTask(
  taskName: string,
  projectSettings: ProjectSettings,
  workspaceFolder: vscode.WorkspaceFolder
): vscode.Task {
  const execution = new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
    return new MicrosoftTunnelingTaskTerminal(projectSettings, workspaceFolder.uri.fsPath);
  });

  const task = new vscode.Task(
    { type: ProductName },
    workspaceFolder,
    taskName,
    ProductName,
    execution,
    constants.tunnelingProblemMatcher
  );
  // The custom execution is a background task and uses problem matcher to finish.
  task.isBackground = true;
  return task;
}

// A log provider that outputs to the pseudoterminal instance using writeEmitter.
class PseudoterminalLogProvider implements LogProvider {
  constructor(private writeEmitter: vscode.EventEmitter<string>) {}
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    // replace all new lines to "\r\n"
    this.writeEmitter.fire(message.replace(/\r|\n|\r\n/g, "\r\n") + "\r\n");
    return true;
  }
  trace(message: string): Promise<boolean> {
    return Promise.resolve(this.log(LogLevel.Trace, message));
  }
  debug(message: string): Promise<boolean> {
    return Promise.resolve(this.log(LogLevel.Debug, message));
  }
  // Do not support color currently
  async info(message: string | Array<{ content: string; color: Colors }>): Promise<boolean> {
    if (typeof message === "string") {
      return await this.log(LogLevel.Info, message);
    } else {
      for (const line of message) {
        this.log(LogLevel.Info, line.content);
      }
      return true;
    }
  }
  warning(message: string): Promise<boolean> {
    return Promise.resolve(this.log(LogLevel.Warning, message));
  }
  error(message: string): Promise<boolean> {
    return Promise.resolve(this.log(LogLevel.Error, message));
  }
  fatal(message: string): Promise<boolean> {
    return Promise.resolve(this.log(LogLevel.Fatal, message));
  }
}
