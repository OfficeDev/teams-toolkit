/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from "child_process";
import * as path from "path";
import * as kill from "tree-kill";
import * as util from "util";
import { v4 as uuidv4 } from "uuid";
import * as vscode from "vscode";
import { FxError, ok, err, Result, UserError, Void } from "@microsoft/teamsfx-api";
import { ExtensionErrors, ExtensionSource } from "../../error";
import * as globalVariables from "../../globalVariables";
import { ProgressHandler } from "../../progressHandler";
import { getDefaultString, localize } from "../../utils/localizeUtils";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { DepsManager, DepsType, LocalEnvManager } from "@microsoft/teamsfx-core";
import { vscodeLogger } from "../depsChecker/vscodeLogger";
import { vscodeTelemetry } from "../depsChecker/vscodeTelemetry";
import { openTerminalCommand, localTunnelDisplayMessages, taskNamePrefix } from "../constants";
import VsCodeLogInstance from "../../commonlib/log";
import { doctorConstant } from "../depsChecker/doctorConstant";

const ngrokTimeout = 1 * 60 * 1000;
const defaultNgrokTunnelName = "bot";
const ngrokEndpointRegex = (tunnelName: string) =>
  new RegExp(`obj=tunnels name=${tunnelName} addr=(?<src>.*) url=(?<endpoint>.*)`);
// Background task cannot resolve variables in VSC. https://github.com/microsoft/vscode/issues/157224
// TODO: remove one after decide to use which placeholder
const defaultNgrokBinFolderPlaceholder = "${teamsfx:ngrokBinFolder}";
const defaultNgrokBinFolderCommand = "${command:fx-extension.get-ngrok-path}";

type LocalTunnelTaskStatus = {
  endpoint?: EndpointInfo;
  terminal: LocalTunnelTaskTerminal;
};

type EndpointInfo = {
  src: string;
  dist: string;
};

export interface LocalTunnelArgs {
  configFile?: string;
  binFolder?: string;
  tunnelName?: string;
  reuse?: boolean;
}

export class LocalTunnelTaskTerminal extends BaseTaskTerminal {
  private static ngrokTaskTerminals: Map<string, LocalTunnelTaskStatus> = new Map<
    string,
    LocalTunnelTaskStatus
  >();

  private childProc: cp.ChildProcess | undefined;
  private isOutputSummary: boolean;
  private readonly taskTerminalId: string;
  private readonly args: LocalTunnelArgs;
  private readonly status: LocalTunnelTaskStatus;
  private readonly progressHandler: ProgressHandler;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as LocalTunnelArgs;
    this.taskTerminalId = uuidv4();
    this.isOutputSummary = false;
    this.progressHandler = new ProgressHandler(localTunnelDisplayMessages.taskName, 1);

    for (const task of LocalTunnelTaskTerminal.ngrokTaskTerminals.values()) {
      task.terminal.close();
    }

    this.status = { terminal: this };
    LocalTunnelTaskTerminal.ngrokTaskTerminals.set(this.taskTerminalId, this.status);
  }

  async stop(error?: any): Promise<void> {
    if (LocalTunnelTaskTerminal.ngrokTaskTerminals.has(this.taskTerminalId)) {
      LocalTunnelTaskTerminal.ngrokTaskTerminals.delete(this.taskTerminalId);
      if (!this.isOutputSummary) {
        this.isOutputSummary = true;
        await this.outputFailureSummary(error);
      }
      if (this.childProc) {
        kill(this.childProc.pid);
      }
      super.stop(error);
    }
  }

  do(): Promise<Result<Void, FxError>> {
    this.outputStartMessage();
    return this.resolveArgs().then((v) =>
      this.outputStepMessage(v.configFile, v.tunnelName).then(() =>
        this.startNgrokChildProcess(v.configFile, v.tunnelName, v.binFolder)
      )
    );
  }

  private async resolveArgs(): Promise<{
    configFile: string;
    tunnelName: string;
    binFolder?: string;
  }> {
    if (!this.args.configFile) {
      throw BaseTaskTerminal.taskDefinitionError("configFile");
    }

    const configFile = path.resolve(
      globalVariables.workspaceUri?.fsPath ?? "",
      BaseTaskTerminal.resolveTeamsFxVariables(this.args.configFile)
    );

    const binFolder = this.args.binFolder
      ? await LocalTunnelTaskTerminal.resolveBinFolder(
          BaseTaskTerminal.resolveTeamsFxVariables(this.args.binFolder)
        )
      : undefined;

    const tunnelName = this.args.tunnelName ?? defaultNgrokTunnelName;

    return {
      configFile: configFile,
      tunnelName: tunnelName,
      binFolder: binFolder,
    };
  }

  private startNgrokChildProcess(
    configFile: string,
    tunnelName: string,
    binFolder?: string
  ): Promise<Result<Void, FxError>> {
    return new Promise<Result<Void, FxError>>((resolve, reject) => {
      const options: cp.SpawnOptions = {
        cwd: globalVariables.workspaceUri?.fsPath ?? "",
        shell: true,
        env: {
          PATH: binFolder ? `${binFolder}${path.delimiter}${process.env.PATH ?? ""}` : undefined,
        },
        detached: false,
      };

      this.childProc = cp.spawn(this.command(configFile, tunnelName), [], options);

      this.childProc.stdout?.setEncoding("utf-8");
      this.childProc.stdout?.on("data", (data: string | Buffer) => {
        const line = data.toString().replace(/\n/g, "\r\n");
        this.writeEmitter.fire(line);
        this.saveNgrokEndpointFromLog(line, tunnelName);
      });

      this.childProc.stderr?.setEncoding("utf-8");
      this.childProc.stderr?.on("data", (data: string | Buffer) => {
        const line = data.toString().replace(/\n/g, "\r\n");
        this.writeEmitter.fire(line);
      });

      this.childProc.on("error", (error) => {
        resolve(
          err(
            new UserError(
              ExtensionSource,
              ExtensionErrors.NgrokProcessError,
              util.format(
                getDefaultString("teamstoolkit.localDebug.ngrokProcessError"),
                error?.message ?? "",
                openTerminalCommand
              ),
              util.format(
                localize("teamstoolkit.localDebug.ngrokProcessError"),
                error?.message ?? "",
                openTerminalCommand
              )
            )
          )
        );
      });

      this.childProc.on("close", (code: number) => {
        if (code === 0) {
          resolve(ok(Void));
        } else {
          resolve(
            err(
              new UserError(
                ExtensionSource,
                ExtensionErrors.NgrokStoppedError,
                util.format(
                  getDefaultString("teamstoolkit.localDebug.ngrokStoppedError"),
                  code,
                  openTerminalCommand
                ),
                util.format(
                  localize("teamstoolkit.localDebug.ngrokStoppedError"),
                  code,
                  openTerminalCommand
                )
              )
            )
          );
        }
      });

      setTimeout(() => {
        if (!this.status.endpoint) {
          this.saveNgrokEndpointFromApi(configFile, tunnelName).then((res) => {
            if (res.isErr()) {
              resolve(res);
            }
          });
        }
      }, ngrokTimeout);
    });
  }

  private command(configFile: string, tunnelName: string) {
    return `ngrok start ${tunnelName} --config=${configFile} --log=stdout --log-format=logfmt`;
  }

  private saveNgrokEndpointFromLog(data: string, tunnelName: string): void {
    const matches = data.match(ngrokEndpointRegex(tunnelName));
    if (matches && matches?.length > 2) {
      const ngrokTunnelInfo = { src: matches[1], dist: matches[2] };
      this.isOutputSummary = true;
      this.status.endpoint = ngrokTunnelInfo;
      this.outputSuccessSummary(ngrokTunnelInfo);
    }
  }

  private async saveNgrokEndpointFromApi(
    configFile: string,
    tunnelName: string
  ): Promise<Result<Void, FxError>> {
    const localEnvManager = new LocalEnvManager();
    const ngrokConfig = await localEnvManager.getNgrokTunnelConfig(configFile);
    const addr = ngrokConfig.get(tunnelName);
    if (!addr) {
      return err(
        new UserError(
          ExtensionSource,
          ExtensionErrors.NgrokTunnelAddrNotFoundError,
          util.format(
            getDefaultString("teamstoolkit.localDebug.ngrokTunnelAddrNotFoundError"),
            tunnelName,
            configFile
          ),
          util.format(
            localize("teamstoolkit.localDebug.ngrokTunnelAddrNotFoundError"),
            tunnelName,
            configFile
          )
        )
      );
    }

    const endpoint = await localEnvManager.getNgrokHttpUrl(addr);
    if (!endpoint) {
      return err(
        new UserError(
          ExtensionSource,
          ExtensionErrors.TunnelEndpointNotFoundError,
          getDefaultString("teamstoolkit.localDebug.tunnelEndpointNotFoundError"),
          localize("teamstoolkit.localDebug.tunnelEndpointNotFoundError")
        )
      );
    }

    const src =
      typeof addr === "number" || Number.isInteger(Number.parseInt(addr))
        ? `http://localhost:${addr}`
        : addr;
    const ngrokTunnelInfo = { src: src, dist: endpoint };
    this.isOutputSummary = true;
    this.status.endpoint = ngrokTunnelInfo;
    this.outputSuccessSummary(ngrokTunnelInfo);
    return ok(Void);
  }

  private outputStartMessage(): void {
    VsCodeLogInstance.info(`${taskNamePrefix}${localTunnelDisplayMessages.taskName}`);
    VsCodeLogInstance.outputChannel.appendLine(localTunnelDisplayMessages.check);
    VsCodeLogInstance.outputChannel.appendLine("");

    this.writeEmitter.fire(`${localTunnelDisplayMessages.startMessage}\r\n\r\n`);
  }

  private async outputStepMessage(configFile: string, tunnelName: string): Promise<void> {
    const stepMessage = localTunnelDisplayMessages.stepMessage(tunnelName, configFile);
    VsCodeLogInstance.outputChannel.appendLine(`${stepMessage} ... `);
    VsCodeLogInstance.outputChannel.appendLine("");

    this.writeEmitter.fire(`${this.command(configFile, tunnelName)}\r\n\r\n`);

    await this.progressHandler.start();
    await this.progressHandler.next(stepMessage);
  }

  private async outputSuccessSummary(ngrokTunnel: EndpointInfo): Promise<void> {
    VsCodeLogInstance.outputChannel.appendLine(localTunnelDisplayMessages.summary);
    VsCodeLogInstance.outputChannel.appendLine("");
    VsCodeLogInstance.outputChannel.appendLine(
      `${doctorConstant.Tick} ${localTunnelDisplayMessages.successSummary(
        ngrokTunnel.src,
        ngrokTunnel.dist
      )}`
    );

    VsCodeLogInstance.outputChannel.appendLine("");
    VsCodeLogInstance.outputChannel.appendLine(
      localTunnelDisplayMessages.learnMore(localTunnelDisplayMessages.learnMoreHelpLink)
    );

    this.writeEmitter.fire(`\r\n${localTunnelDisplayMessages.successMessage}\r\n`);

    await this.progressHandler.end(true);
  }

  private async outputFailureSummary(error?: any): Promise<void> {
    VsCodeLogInstance.outputChannel.appendLine(localTunnelDisplayMessages.summary);

    VsCodeLogInstance.outputChannel.appendLine("");
    VsCodeLogInstance.outputChannel.appendLine(
      `${doctorConstant.Cross} ${error?.message ?? localTunnelDisplayMessages.errorMessage}`
    );

    VsCodeLogInstance.outputChannel.appendLine("");
    VsCodeLogInstance.outputChannel.appendLine(
      localTunnelDisplayMessages.learnMore(localTunnelDisplayMessages.learnMoreHelpLink)
    );

    this.writeEmitter.fire(`\r\n${localTunnelDisplayMessages.errorMessage}\r\n`);

    await this.progressHandler.end(false);
  }

  public static async getNgrokEndpoint(): Promise<string> {
    if (this.ngrokTaskTerminals.size > 2) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.MultipleTunnelServiceError,
        getDefaultString("teamstoolkit.localDebug.multipleTunnelServiceError"),
        localize("teamstoolkit.localDebug.multipleTunnelServiceError")
      );
    }

    if (this.ngrokTaskTerminals.size === 0) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.NoTunnelServiceError,
        getDefaultString("teamstoolkit.localDebug.noTunnelServiceError"),
        localize("teamstoolkit.localDebug.noTunnelServiceError")
      );
    }

    const terminalStatus = [...this.ngrokTaskTerminals.values()][0];
    if (!terminalStatus.endpoint) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.TunnelServiceNotStartedError,
        getDefaultString("teamstoolkit.localDebug.tunnelServiceNotStartedError"),
        localize("teamstoolkit.localDebug.tunnelServiceNotStartedError")
      );
    }
    return terminalStatus.endpoint.dist;
  }

  public static async getNgrokBinFolder(): Promise<string> {
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
    const res = (await depsManager.getStatus([DepsType.Ngrok]))?.[0];
    if (!res.isInstalled || !res.details.binFolders) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.NgrokNotFoundError,
        getDefaultString("teamstoolkit.localDebug.ngrokNotFoundError"),
        localize("teamstoolkit.localDebug.ngrokNotFoundError")
      );
    }
    return res.details.binFolders.join(path.delimiter);
  }

  public static async stopAll(): Promise<void> {
    for (const task of LocalTunnelTaskTerminal.ngrokTaskTerminals.values()) {
      if (!task.terminal.args?.reuse) {
        task.terminal.close();
      }
    }
  }

  private static async resolveBinFolder(str: string): Promise<string> {
    if (
      str.includes(defaultNgrokBinFolderPlaceholder) ||
      str.includes(defaultNgrokBinFolderCommand)
    ) {
      const ngrokPath = await this.getNgrokBinFolder();
      str = str.replace(defaultNgrokBinFolderPlaceholder, ngrokPath);
      str = str.replace(defaultNgrokBinFolderCommand, ngrokPath);
    }
    return str;
  }
}
