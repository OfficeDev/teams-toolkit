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
import { getDefaultString, localize } from "../../utils/localizeUtils";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import { DepsManager, DepsType, LocalEnvManager } from "@microsoft/teamsfx-core";
import { vscodeLogger } from "../depsChecker/vscodeLogger";
import { vscodeTelemetry } from "../depsChecker/vscodeTelemetry";
import { openTerminalCommand } from "../constants";
import VsCodeLogInstance from "../../commonlib/log";

const ngrokTunnelName = "bot";
const ngrokEndpointRegex = /obj=tunnels name=bot addr=(?<src>.*) url=(?<endpoint>.*)/;
const defaultNgrokBinFolderPlaceholder = "${teamsfx:ngrokBinFolder}";

type LocalTunnelTaskStatus = {
  resolvedConfigFile?: string;
  endpoint?: string;
  terminal: LocalTunnelTaskTerminal;
};

export interface LocalTunnelArgs {
  configFile?: string;
  binFolder?: string;
  // TODO: reuse?: boolean
}

export class LocalTunnelTaskTerminal extends BaseTaskTerminal {
  private static ngrokTaskTerminals: Map<string, LocalTunnelTaskStatus> = new Map<
    string,
    LocalTunnelTaskStatus
  >();

  private childProc: cp.ChildProcess | undefined;
  private readonly taskTerminalId: string;
  private readonly args: LocalTunnelArgs;
  private readonly status: LocalTunnelTaskStatus;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as LocalTunnelArgs;
    this.taskTerminalId = uuidv4();

    for (const task of LocalTunnelTaskTerminal.ngrokTaskTerminals.values()) {
      task.terminal.close();
    }

    this.status = { terminal: this };
    LocalTunnelTaskTerminal.ngrokTaskTerminals.set(this.taskTerminalId, this.status);
  }

  stop(error?: any): void {
    if (LocalTunnelTaskTerminal.ngrokTaskTerminals.has(this.taskTerminalId)) {
      if (this.childProc) {
        kill(this.childProc.pid);
      }
      super.stop(error);
      LocalTunnelTaskTerminal.ngrokTaskTerminals.delete(this.taskTerminalId);
    }
  }

  do(): Promise<Result<Void, FxError>> {
    return this.resolveArgs().then((v) => this.startNgrokChildProcess(v.configFile, v.binFolder));
  }

  private async resolveArgs(): Promise<{ configFile: string; binFolder?: string }> {
    if (!this.args.configFile) {
      throw BaseTaskTerminal.taskDefinitionError("configFile");
    }

    const configFile = BaseTaskTerminal.resolveTeamsFxVariables(this.args.configFile);
    this.status.resolvedConfigFile = configFile;

    const binFolder = this.args.binFolder
      ? await LocalTunnelTaskTerminal.resolveBinFolder(
          BaseTaskTerminal.resolveTeamsFxVariables(this.args.binFolder)
        )
      : undefined;

    return { configFile: configFile, binFolder: binFolder };
  }

  private startNgrokChildProcess(
    configFile: string,
    binFolder?: string
  ): Promise<Result<Void, FxError>> {
    return new Promise<Result<Void, FxError>>((resolve, reject) => {
      VsCodeLogInstance.info("Starting local tunnel task.");
      const command = `ngrok start ${ngrokTunnelName} --config=${configFile} --log=stdout --log-format=logfmt`;
      this.writeEmitter.fire(`${command}\r\n\r\n`);
      const options: cp.SpawnOptions = {
        cwd: globalVariables.workspaceUri?.fsPath ?? "",
        shell: true,
        env: {
          PATH: binFolder ? `${binFolder}${path.delimiter}${process.env.PATH ?? ""}` : undefined,
        },
        detached: false,
      };

      this.childProc = cp.spawn(command, [], options);

      this.childProc.stdout?.setEncoding("utf-8");
      this.childProc.stdout?.on("data", (data: string | Buffer) => {
        const line = data.toString().replace(/\n/g, "\r\n");
        this.writeEmitter.fire(line);
        const ngrokTunnel = this.parseNgrokEndpointFromLog(line);
        if (ngrokTunnel) {
          this.status.endpoint = ngrokTunnel.dist;
          VsCodeLogInstance.info("Local tunnel task is started successfully.");
        }
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
    });
  }

  private parseNgrokEndpointFromLog(data: string): { src: string; dist: string } | undefined {
    const matches = data.match(ngrokEndpointRegex);
    if (matches && matches?.length > 2) {
      return { src: matches[1], dist: matches[2] };
    }
    return undefined;
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
    if (terminalStatus.endpoint) {
      return terminalStatus.endpoint;
    }

    if (!terminalStatus.resolvedConfigFile) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.TunnelServiceNotStartedError,
        getDefaultString("teamstoolkit.localDebug.tunnelServiceNotStartedError"),
        localize("teamstoolkit.localDebug.tunnelServiceNotStartedError")
      );
    }

    const localEnvManager = new LocalEnvManager();
    const ngrokConfig = await localEnvManager.getNgrokTunnelConfig(
      terminalStatus.resolvedConfigFile
    );

    const addr = ngrokConfig.get(ngrokTunnelName);
    if (!addr) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.NgrokTunnelAddrNotFoundError,
        util.format(
          getDefaultString("teamstoolkit.localDebug.ngrokTunnelAddrNotFoundError"),
          ngrokTunnelName,
          terminalStatus.resolvedConfigFile
        ),
        util.format(
          localize("teamstoolkit.localDebug.ngrokTunnelAddrNotFoundError"),
          ngrokTunnelName,
          terminalStatus.resolvedConfigFile
        )
      );
    }

    const endpoint = await localEnvManager.getNgrokHttpUrl(addr);

    if (!endpoint) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.TunnelServiceNotStartedError,
        getDefaultString("teamstoolkit.localDebug.tunnelServiceNotStartedError"),
        localize("teamstoolkit.localDebug.tunnelServiceNotStartedError")
      );
    }
    return endpoint;
  }

  private static async resolveBinFolder(str: string): Promise<string> {
    if (str === defaultNgrokBinFolderPlaceholder) {
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
    return str;
  }
}
