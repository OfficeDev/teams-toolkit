/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from "child_process";
import * as path from "path";
import * as kill from "tree-kill";
import * as util from "util";
import * as vscode from "vscode";

import { assembleError, err, FxError, ok, Result, UserError, Void } from "@microsoft/teamsfx-api";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import { DepsManager, DepsType } from "@microsoft/teamsfx-core/build/common/deps-checker";
import {
  LocalEnvManager,
  LocalTelemetryReporter,
  TaskDefaultValue,
} from "@microsoft/teamsfx-core/build/common/local";

import VsCodeLogInstance from "../../commonlib/log";
import { ExtensionErrors, ExtensionSource } from "../../error";
import * as globalVariables from "../../globalVariables";
import { ProgressHandler } from "../../progressHandler";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../telemetry/extTelemetryEvents";
import { getDefaultString, localize } from "../../utils/localizeUtils";
import { getLocalDebugSession, Step } from "../commonUtils";
import {
  localTunnelDisplayMessages,
  openTerminalDisplayMessage,
  openTerminalMessage,
} from "../constants";
import { doctorConstant } from "../depsChecker/doctorConstant";
import { vscodeLogger } from "../depsChecker/vscodeLogger";
import { vscodeTelemetry } from "../depsChecker/vscodeTelemetry";
import { DefaultPlaceholder, localTelemetryReporter, maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";

const ngrokTimeout = 1 * 60 * 1000;
const ngrokTimeInterval = 10 * 1000;
const ngrokEndpointRegex =
  /obj=tunnels name=(?<tunnelName>.*) addr=(?<src>.*) url=(?<endpoint>https:\/\/([\S])*)/;
const ngrokWebServiceRegex = /msg="starting web service" obj=web addr=(?<webServiceUrl>([\S])*)/;
const defaultNgrokWebServiceUrl = "http://127.0.0.1:4040/api/tunnels";

type LocalTunnelTaskStatus = {
  endpoint?: EndpointInfo;
  tunnelInspection?: string;
  terminal: LocalTunnelTaskTerminal;
};

type EndpointInfo = {
  src: string;
  dist: string;
};

export interface LocalTunnelArgs {
  ngrokArgs?: string | string[];
  ngrokPath?: string;
  tunnelInspection?: string;
}

export class LocalTunnelTaskTerminal extends BaseTaskTerminal {
  private static ngrokTaskTerminals: Map<string, LocalTunnelTaskStatus> = new Map<
    string,
    LocalTunnelTaskStatus
  >();

  private childProc: cp.ChildProcess | undefined;
  private isOutputSummary: boolean;
  private log: string;

  private readonly args: LocalTunnelArgs;
  private readonly status: LocalTunnelTaskStatus;
  private readonly progressHandler: ProgressHandler;
  private readonly step: Step;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
    this.args = taskDefinition.args as LocalTunnelArgs;
    this.isOutputSummary = false;
    this.progressHandler = new ProgressHandler(localTunnelDisplayMessages.taskName, 1, "terminal");
    this.step = new Step(1);
    this.log = "";

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
    return Correlator.runWithId(getLocalDebugSession().id, () =>
      localTelemetryReporter.runWithTelemetryProperties(
        TelemetryEvent.DebugStartLocalTunnelTask,
        {
          [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
          [TelemetryProperty.DebugTaskArgs]: this.generateTaskArgsTelemetry(),
        },
        () => this._do()
      )
    );
  }

  private async _do(): Promise<Result<Void, FxError>> {
    this.outputStartMessage();
    return this.resolveArgs().then((v) =>
      this.outputStepMessage(v.ngrokArgs, v.ngrokPath).then(() =>
        this.startNgrokChildProcess(v.ngrokArgs, v.ngrokPath)
      )
    );
  }

  private async resolveArgs(): Promise<{
    ngrokArgs: string[];
    ngrokPath: string;
  }> {
    if (!this.args.ngrokArgs) {
      throw BaseTaskTerminal.taskDefinitionError("ngrokArgs");
    }

    const ngrokArgs = !Array.isArray(this.args.ngrokArgs)
      ? [this.args.ngrokArgs]
      : this.args.ngrokArgs;

    const ngrokPath = !this.args.ngrokPath
      ? await LocalTunnelTaskTerminal.getNgrokPath()
      : this.args.ngrokPath;

    return {
      ngrokArgs: ngrokArgs,
      ngrokPath: ngrokPath,
    };
  }

  private startNgrokChildProcess(
    ngrokArgs: string[],
    ngrokPath: string
  ): Promise<Result<Void, FxError>> {
    const timeouts: NodeJS.Timeout[] = [];
    return new Promise<Result<Void, FxError>>((resolve, reject) => {
      const options: cp.SpawnOptions = {
        cwd: globalVariables.workspaceUri?.fsPath ?? "",
        shell: true,
        detached: false,
      };

      this.childProc = cp.spawn(LocalTunnelTaskTerminal.command(ngrokArgs, ngrokPath), [], options);

      this.childProc.stdout?.setEncoding("utf-8");
      this.childProc.stdout?.on("data", (data: string | Buffer) => {
        this.log += data.toString();
        const line = data.toString().replace(/\n/g, "\r\n");
        this.writeEmitter.fire(line);
        const res = this.saveNgrokEndpointFromLog(line);
        if (res) {
          timeouts.forEach((t) => clearTimeout(t));
        }
        this.saveNgrokTunnelInspectionFromLog(line);
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
                error?.message ?? ""
              ) +
                " " +
                openTerminalMessage(),
              util.format(
                localize("teamstoolkit.localDebug.ngrokProcessError"),
                error?.message ?? ""
              ) +
                " " +
                openTerminalDisplayMessage()
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
                util.format(getDefaultString("teamstoolkit.localDebug.ngrokStoppedError"), code) +
                  " " +
                  openTerminalMessage(),
                util.format(localize("teamstoolkit.localDebug.ngrokStoppedError"), code) +
                  " " +
                  openTerminalDisplayMessage()
              )
            )
          );
        }
      });

      for (let i = ngrokTimeInterval; i < ngrokTimeout; i += ngrokTimeInterval) {
        timeouts.push(
          setTimeout(() => {
            this.saveNgrokEndpointFromApi().then((res) => {
              if (res.isOk() && res.value) {
                timeouts.forEach((t) => clearTimeout(t));
              }
            });
          }, i)
        );
      }

      timeouts.push(
        setTimeout(() => {
          this.saveNgrokEndpointFromApi().then((res) => {
            if (res.isErr()) {
              resolve(res);
            }
          });
        }, ngrokTimeout)
      );
    }).finally(() => {
      timeouts.forEach((t) => clearTimeout(t));
    });
  }

  private saveNgrokEndpointFromLog(data: string): boolean {
    try {
      if (this.status.endpoint || this.args.tunnelInspection) {
        return false;
      }
      const matches = data.match(ngrokEndpointRegex);
      if (matches && matches?.length > 3) {
        const ngrokTunnelInfo = { src: matches[2], dist: matches[3] };
        this.isOutputSummary = true;
        this.status.endpoint = ngrokTunnelInfo;
        this.outputSuccessSummary(ngrokTunnelInfo);
        return true;
      }
    } catch {
      // Return false
    }
    return false;
  }

  private saveNgrokTunnelInspectionFromLog(data: string): boolean {
    try {
      const matches = data.match(ngrokWebServiceRegex);
      if (matches && matches?.length > 1) {
        const webServiceAddr = matches[1];
        this.status.tunnelInspection = `http://${webServiceAddr}`;
        return true;
      }
    } catch {
      // Return false
    }
    return false;
  }

  private async saveNgrokEndpointFromApi(): Promise<Result<boolean, FxError>> {
    let webServiceUrl: string | undefined = undefined;
    try {
      if (this.status.endpoint) {
        return ok(false);
      }
      const localEnvManager = new LocalEnvManager();
      webServiceUrl =
        this.args.tunnelInspection ?? this.status.tunnelInspection ?? defaultNgrokWebServiceUrl;
      const endpoint = await localEnvManager.getNgrokTunnelFromApi(webServiceUrl);
      if (endpoint) {
        this.isOutputSummary = true;
        this.status.endpoint = endpoint;
        this.outputSuccessSummary(endpoint);
        return ok(true);
      }
    } catch {
      // Return TunnelEndpointNotFoundError
    }
    return err(
      new UserError(
        ExtensionSource,
        ExtensionErrors.TunnelEndpointNotFoundError,
        util.format(
          getDefaultString("teamstoolkit.localDebug.tunnelEndpointNotFoundError"),
          webServiceUrl
        ),
        util.format(localize("teamstoolkit.localDebug.tunnelEndpointNotFoundError", webServiceUrl))
      )
    );
  }

  private outputStartMessage(): void {
    VsCodeLogInstance.info(localTunnelDisplayMessages.title);
    VsCodeLogInstance.outputChannel.appendLine("");
    VsCodeLogInstance.outputChannel.appendLine(
      localTunnelDisplayMessages.checkNumber(this.step.totalSteps)
    );
    VsCodeLogInstance.outputChannel.appendLine("");

    this.writeEmitter.fire(`${localTunnelDisplayMessages.startMessage}\r\n\r\n`);
  }

  private async outputStepMessage(ngrokArgs: string[], ngrokPath: string): Promise<void> {
    VsCodeLogInstance.outputChannel.appendLine(
      `${this.step.getPrefix()} ${localTunnelDisplayMessages.startMessage} ... `
    );
    VsCodeLogInstance.outputChannel.appendLine("");

    this.writeEmitter.fire(`${LocalTunnelTaskTerminal.command(ngrokArgs, ngrokPath)}\r\n\r\n`);

    await this.progressHandler.start();
    await this.progressHandler.next(localTunnelDisplayMessages.startMessage);
  }

  private async outputSuccessSummary(ngrokTunnel: EndpointInfo): Promise<void> {
    const duration = this.getDurationInSeconds();
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
    VsCodeLogInstance.outputChannel.appendLine("");
    if (duration) {
      VsCodeLogInstance.info(localTunnelDisplayMessages.durationMessage(duration));
    }

    this.writeEmitter.fire(
      `\r\n${localTunnelDisplayMessages.forwardingUrl(ngrokTunnel.src, ngrokTunnel.dist)}\r\n`
    );
    this.writeEmitter.fire(`\r\n${localTunnelDisplayMessages.successMessage}\r\n\r\n`);

    await this.progressHandler.end(true);

    localTelemetryReporter.sendTelemetryEvent(
      TelemetryEvent.DebugStartLocalTunnelTaskStarted,
      {
        [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
        [TelemetryProperty.DebugTaskArgs]: this.generateTaskArgsTelemetry(),
      },
      {
        [LocalTelemetryReporter.PropertyDuration]: duration ?? -1,
      }
    );
  }

  private async outputFailureSummary(error?: any): Promise<void> {
    const fxError = assembleError(error ?? new Error(localTunnelDisplayMessages.errorMessage));
    VsCodeLogInstance.outputChannel.appendLine(localTunnelDisplayMessages.summary);

    VsCodeLogInstance.outputChannel.appendLine("");
    VsCodeLogInstance.outputChannel.appendLine(`${doctorConstant.Cross} ${fxError.message}`);

    VsCodeLogInstance.outputChannel.appendLine("");
    VsCodeLogInstance.outputChannel.appendLine(
      localTunnelDisplayMessages.learnMore(localTunnelDisplayMessages.learnMoreHelpLink)
    );
    VsCodeLogInstance.outputChannel.appendLine("");

    this.writeEmitter.fire(`\r\n${localTunnelDisplayMessages.errorMessage}\r\n`);

    await this.progressHandler.end(false);

    localTelemetryReporter.sendTelemetryErrorEvent(
      TelemetryEvent.DebugStartLocalTunnelTaskStarted,
      fxError,
      {
        [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
        [TelemetryProperty.Success]: TelemetrySuccess.No,
        [TelemetryProperty.DebugTaskArgs]: this.generateTaskArgsTelemetry(),
        [TelemetryProperty.DebugNgrokLog]: this.log,
      },
      {
        [LocalTelemetryReporter.PropertyDuration]: this.getDurationInSeconds() ?? -1,
      }
    );
  }

  private generateTaskArgsTelemetry(): string {
    return JSON.stringify({
      ngrokArgs: maskValue(
        Array.isArray(this.args.ngrokArgs) ? this.args.ngrokArgs.join(" ") : this.args.ngrokArgs,
        [
          {
            value: TaskDefaultValue.startLocalTunnel.ngrokArgs,
            mask: DefaultPlaceholder,
          },
        ]
      ),
      ngrokPath: maskValue(this.args.ngrokPath, ["ngrok"]),
      tunnelInspection: maskValue(this.args.tunnelInspection),
    });
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

  private static async getNgrokPath(): Promise<string> {
    const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
    const res = (await depsManager.getStatus([DepsType.Ngrok]))?.[0];
    if (
      !res.isInstalled ||
      !res.details.binFolders ||
      res.details.binFolders.length === 0 ||
      !res.command
    ) {
      throw new UserError(
        ExtensionSource,
        ExtensionErrors.NgrokNotFoundError,
        getDefaultString("teamstoolkit.localDebug.ngrokNotFoundError"),
        localize("teamstoolkit.localDebug.ngrokNotFoundError")
      );
    }
    return path.resolve(res.details.binFolders[0], res.command);
  }

  private static command(ngrokArgs: string[], ngrokPath: string): string {
    if (!this.includeOption(ngrokArgs, "--log=")) {
      ngrokArgs.push("--log=stdout");
    }

    if (!this.includeOption(ngrokArgs, "--log-format=")) {
      ngrokArgs.push("--log-format=logfmt");
    }

    return `${ngrokPath} ${ngrokArgs.join(" ")}`;
  }

  private static includeOption(args: string[], option: string): boolean {
    for (const arg of args) {
      if (arg.includes(option)) {
        return true;
      }
    }
    return false;
  }

  public static async stopAll(): Promise<void> {
    for (const task of LocalTunnelTaskTerminal.ngrokTaskTerminals.values()) {
      task.terminal.close();
    }
  }
}
