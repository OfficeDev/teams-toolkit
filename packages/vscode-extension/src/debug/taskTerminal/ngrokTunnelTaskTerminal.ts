/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import * as cp from "child_process";
import * as path from "path";
import * as kill from "tree-kill";
import * as util from "util";
import * as vscode from "vscode";
import { err, FxError, ok, Result, UserError, Void } from "@microsoft/teamsfx-api";
import { isV3Enabled } from "@microsoft/teamsfx-core";
import { DepsManager, DepsType } from "@microsoft/teamsfx-core/build/common/deps-checker";
import {
  LocalEnvManager,
  TaskDefaultValue,
  TunnelType,
} from "@microsoft/teamsfx-core/build/common/local";
import VsCodeLogInstance from "../../commonlib/log";
import { ExtensionErrors, ExtensionSource } from "../../error";
import * as globalVariables from "../../globalVariables";
import { TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { getDefaultString, localize } from "../../utils/localizeUtils";
import {
  ngrokTunnelDisplayMessages,
  openTerminalDisplayMessage,
  openTerminalMessage,
} from "../constants";
import { vscodeLogger } from "../depsChecker/vscodeLogger";
import { vscodeTelemetry } from "../depsChecker/vscodeTelemetry";
import { DefaultPlaceholder, maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import {
  BaseTunnelTaskTerminal,
  EndpointInfo,
  IBaseTunnelArgs,
  OutputInfo,
  TunnelError,
} from "./baseTunnelTaskTerminal";

const ngrokTimeout = 1 * 60 * 1000;
const ngrokTimeInterval = 10 * 1000;
const ngrokEndpointRegex =
  /obj=tunnels name=(?<tunnelName>.*) addr=(?<src>.*) url=(?<endpoint>https:\/\/([\S])*)/;
const ngrokWebServiceRegex = /msg="starting web service" obj=web addr=(?<webServiceUrl>([\S])*)/;
const defaultNgrokWebServiceUrl = "http://127.0.0.1:4040/api/tunnels";

type NgrokTunnelTaskStatus = {
  endpoint?: EndpointInfo;
  tunnelInspection?: string;
};

export interface INgrokTunnelArgs extends IBaseTunnelArgs {
  ngrokArgs: string[];
  ngrokPath?: string;
  tunnelInspection?: string;
  writeToEnvironmentFile?: {
    endpoint?: string;
    domain?: string;
  };
}

export class NgrokTunnelTaskTerminal extends BaseTunnelTaskTerminal {
  private childProc: cp.ChildProcess | undefined;
  private isOutputSummary: boolean;

  protected readonly args: INgrokTunnelArgs;
  private readonly status: NgrokTunnelTaskStatus;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition, isV3Enabled() ? 2 : 1);
    this.args = taskDefinition.args as INgrokTunnelArgs;
    this.isOutputSummary = false;
    this.status = {};
  }

  async stop(error?: any): Promise<void> {
    if (NgrokTunnelTaskTerminal.tunnelTaskTerminals.has(this.taskTerminalId)) {
      NgrokTunnelTaskTerminal.tunnelTaskTerminals.delete(this.taskTerminalId);
      if (!this.isOutputSummary) {
        this.isOutputSummary = true;
        await this.outputFailureSummary(ngrokTunnelDisplayMessages, error);
      }
      if (this.childProc) {
        kill(this.childProc.pid);
      }
      super.stop(error);
    }
  }

  protected async _do(): Promise<Result<Void, FxError>> {
    await this.outputStartMessage(ngrokTunnelDisplayMessages);
    await this.resolveArgs(this.args);
    let ngrokPath;
    if (isV3Enabled()) {
      await this.outputInstallNgrokStepMessage();
      const res = await this.installNgrok();
      if (res.isErr()) {
        return err(res.error);
      }
      ngrokPath = res.value;
    } else {
      ngrokPath = await NgrokTunnelTaskTerminal.getNgrokPath();
    }
    await this.outputStartNgrokStepMessage(this.args.ngrokArgs, ngrokPath);
    return await this.startNgrokChildProcess(this.args.ngrokArgs, ngrokPath);
  }

  protected async resolveArgs(args: INgrokTunnelArgs): Promise<void> {
    super.resolveArgs(args);

    if (!args.ngrokArgs) {
      throw BaseTaskTerminal.taskDefinitionError("args.ngrokArgs");
    }

    args.ngrokArgs = !Array.isArray(args.ngrokArgs) ? [args.ngrokArgs] : args.ngrokArgs;

    if (
      typeof args.writeToEnvironmentFile?.domain !== "undefined" &&
      typeof args.writeToEnvironmentFile?.domain !== "string"
    ) {
      throw BaseTaskTerminal.taskDefinitionError("args.writeToEnvironmentFile.domain");
    }

    if (
      typeof args.writeToEnvironmentFile?.endpoint !== "undefined" &&
      typeof args.writeToEnvironmentFile?.endpoint !== "string"
    ) {
      throw BaseTaskTerminal.taskDefinitionError("args.writeToEnvironmentFile.endpoint");
    }
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

      this.childProc = cp.spawn(NgrokTunnelTaskTerminal.command(ngrokArgs, ngrokPath), [], options);

      this.childProc.stdout?.setEncoding("utf-8");
      this.childProc.stdout?.on("data", (data: string | Buffer) => {
        const line = data.toString().replace(/\n/g, "\r\n");
        this.writeEmitter.fire(line);

        if (!this.status.endpoint && !this.args.tunnelInspection) {
          this.findAndSaveNgrokEndpointFromLog(line).then((res) => {
            if (res.isOk() && res.value) {
              timeouts.forEach((t) => clearTimeout(t));
            } else if (res.isErr()) {
              resolve(res);
            }
          });
        }

        this.saveNgrokTunnelInspectionFromLog(line);
      });

      this.childProc.stderr?.setEncoding("utf-8");
      this.childProc.stderr?.on("data", (data: string | Buffer) => {
        const line = data.toString().replace(/\n/g, "\r\n");
        this.writeEmitter.fire(line);
      });

      this.childProc.on("error", (error) => {
        resolve(err(NgrokTunnelError.NgrokProcessError(error)));
      });

      this.childProc.on("close", (code: number) => {
        if (code === 0) {
          resolve(ok(Void));
        } else {
          resolve(err(NgrokTunnelError.NgrokStoppedError(code)));
        }
      });

      for (let i = ngrokTimeInterval; i < ngrokTimeout; i += ngrokTimeInterval) {
        timeouts.push(
          setTimeout(() => {
            if (!this.status.endpoint) {
              this.findAndSaveNgrokEndpointFromApi().then((res) => {
                if (res.isOk() && res.value) {
                  timeouts.forEach((t) => clearTimeout(t));
                } else if (res.isErr()) {
                  resolve(res);
                }
              });
            }
          }, i)
        );
      }

      timeouts.push(
        setTimeout(() => {
          if (!this.status.endpoint) {
            this.findAndSaveNgrokEndpointFromApi().then((res) => {
              if (res.isOk() && !res.value) {
                const webServiceUrl = this.getWebServiceUrl();
                resolve(err(NgrokTunnelError.TunnelEndpointNotFoundError(webServiceUrl)));
              } else if (res.isErr()) {
                resolve(res);
              }
            });
          }
        }, ngrokTimeout)
      );
    }).finally(() => {
      timeouts.forEach((t) => clearTimeout(t));
    });
  }

  private async findAndSaveNgrokEndpointFromLog(data: string): Promise<Result<boolean, FxError>> {
    try {
      const matches = data.match(ngrokEndpointRegex);
      if (matches && matches?.length > 3) {
        const ngrokTunnelInfo = { src: matches[2], dest: matches[3] };
        const saveEnvRes = await this.saveNgrokEndpointToEnv(ngrokTunnelInfo.dest);
        if (saveEnvRes.isErr()) {
          return err(saveEnvRes.error);
        }
        this.isOutputSummary = true;
        this.status.endpoint = ngrokTunnelInfo;
        await this.outputSuccessSummary(
          ngrokTunnelDisplayMessages,
          [ngrokTunnelInfo],
          saveEnvRes.value
        );
        return ok(true);
      }
    } catch {
      // Return false
    }
    return ok(false);
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

  private async findAndSaveNgrokEndpointFromApi(): Promise<Result<boolean, FxError>> {
    try {
      const localEnvManager = new LocalEnvManager();
      const webServiceUrl = this.getWebServiceUrl();
      const endpoint = await localEnvManager.getNgrokTunnelFromApi(webServiceUrl);
      if (endpoint) {
        const saveEnvRes = await this.saveNgrokEndpointToEnv(endpoint.dest);
        if (saveEnvRes.isErr()) {
          return err(saveEnvRes.error);
        }
        this.isOutputSummary = true;
        this.status.endpoint = endpoint;
        await this.outputSuccessSummary(ngrokTunnelDisplayMessages, [endpoint], saveEnvRes.value);
        return ok(true);
      }
    } catch {
      // Return false
    }
    return ok(false);
  }

  private getWebServiceUrl(): string {
    return this.args.tunnelInspection ?? this.status.tunnelInspection ?? defaultNgrokWebServiceUrl;
  }

  private async saveNgrokEndpointToEnv(endpoint: string): Promise<Result<OutputInfo, FxError>> {
    try {
      const url = new URL(endpoint);
      const envVars: { [key: string]: string } = {};
      if (this.args?.writeToEnvironmentFile?.endpoint) {
        envVars[this.args.writeToEnvironmentFile.endpoint] = url.origin;
      }
      if (this.args?.writeToEnvironmentFile?.domain) {
        envVars[this.args.writeToEnvironmentFile.domain] = url.hostname;
      }
      return this.savePropertiesToEnv(this.args.env, envVars);
    } catch (error: any) {
      return err(TunnelError.TunnelEnvError(error));
    }
  }

  private async outputInstallNgrokStepMessage(): Promise<void> {
    VsCodeLogInstance.outputChannel.appendLine(
      `${this.step.getPrefix()} ${ngrokTunnelDisplayMessages.checkNgrokMessage()} ... `
    );
    await this.progressHandler.next(ngrokTunnelDisplayMessages.checkNgrokMessage());
  }

  private async outputStartNgrokStepMessage(ngrokArgs: string[], ngrokPath: string): Promise<void> {
    VsCodeLogInstance.outputChannel.appendLine(
      `${this.step.getPrefix()} ${ngrokTunnelDisplayMessages.startNgrokMessage()} ... `
    );
    VsCodeLogInstance.outputChannel.appendLine("");

    this.writeEmitter.fire(`${NgrokTunnelTaskTerminal.command(ngrokArgs, ngrokPath)}\r\n\r\n`);

    await this.progressHandler.next(ngrokTunnelDisplayMessages.startNgrokMessage());
  }

  protected generateTelemetries(): { [key: string]: string } {
    return {
      [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
      [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
        type: maskValue(this.args.type, Object.values(TunnelType)),
        ngrokArgs: maskValue(
          Array.isArray(this.args.ngrokArgs) ? this.args.ngrokArgs.join(" ") : this.args.ngrokArgs,
          [
            {
              value: TaskDefaultValue.startLocalTunnel.ngrokArgs,
              mask: DefaultPlaceholder,
            },
          ]
        ),
        ngrokPath: maskValue(this.args.ngrokPath, [TaskDefaultValue.startLocalTunnel.ngrokPath]),
        tunnelInspection: maskValue(this.args.tunnelInspection),
        env: maskValue(this.args.env, [TaskDefaultValue.env]),
        writeToEnvironmentFile: {
          endpoint: maskValue(this.args.writeToEnvironmentFile?.endpoint, [
            TaskDefaultValue.startLocalTunnel.writeToEnvironmentFile.endpoint,
          ]),
          domain: maskValue(this.args.writeToEnvironmentFile?.domain, [
            TaskDefaultValue.startLocalTunnel.writeToEnvironmentFile.domain,
          ]),
        },
      }),
    };
  }

  // TODO: remove getNgrokEndpoint after v3 enabled
  public static async getNgrokEndpoint(): Promise<string> {
    if (this.tunnelTaskTerminals.size > 2) {
      throw NgrokTunnelError.MultipleTunnelServiceError();
    }

    if (this.tunnelTaskTerminals.size === 0) {
      throw NgrokTunnelError.NoTunnelServiceError();
    }

    const terminalStatus = [...this.tunnelTaskTerminals.values()][0] as NgrokTunnelTaskTerminal;
    if (!terminalStatus.status.endpoint) {
      throw NgrokTunnelError.TunnelServiceNotStartedError();
    }
    return terminalStatus.status.endpoint.dest;
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
      throw NgrokTunnelError.NgrokNotFoundError();
    }
    return path.resolve(res.details.binFolders[0], res.command);
  }

  private async installNgrok(): Promise<Result<string, FxError>> {
    try {
      if (this.args.ngrokPath) {
        this.outputMessageList.push(
          ngrokTunnelDisplayMessages.skipInstallMessage(this.args.ngrokPath)
        );
        return ok(this.args.ngrokPath);
      }
      const depsManager = new DepsManager(vscodeLogger, vscodeTelemetry);
      const res = (
        await depsManager.ensureDependencies([DepsType.Ngrok], {
          fastFail: true,
          doctor: true,
        })
      )?.[0];
      if (
        !res.isInstalled ||
        !res.details.binFolders ||
        res.details.binFolders.length === 0 ||
        !res.command ||
        res.error
      ) {
        return err(NgrokTunnelError.NgrokInstallationError());
      }
      const ngrokPath = path.resolve(res.details.binFolders[0], res.command);
      this.outputMessageList.push(ngrokTunnelDisplayMessages.installSuccessMessage(ngrokPath));
      return ok(ngrokPath);
    } catch (error: any) {
      return err(NgrokTunnelError.NgrokInstallationError(error));
    }
  }

  private static command(ngrokArgs: string[], ngrokPath: string): string {
    if (!this.includeOption(ngrokArgs, "--log=")) {
      ngrokArgs.push("--log=stdout");
    }

    if (!this.includeOption(ngrokArgs, "--log-format=")) {
      ngrokArgs.push("--log-format=logfmt");
    }

    return `"${ngrokPath}" ${ngrokArgs.join(" ")}`;
  }

  private static includeOption(args: string[], option: string): boolean {
    for (const arg of args) {
      if (arg.includes(option)) {
        return true;
      }
    }
    return false;
  }
}

const NgrokTunnelError = Object.freeze({
  NgrokProcessError: (error: any) =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.NgrokProcessError,
      util.format(
        getDefaultString("teamstoolkit.localDebug.ngrokProcessError"),
        error?.message ?? ""
      ) +
        " " +
        openTerminalMessage(),
      util.format(localize("teamstoolkit.localDebug.ngrokProcessError"), error?.message ?? "") +
        " " +
        openTerminalDisplayMessage()
    ),

  NgrokStoppedError: (code: number) =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.NgrokStoppedError,
      util.format(getDefaultString("teamstoolkit.localDebug.ngrokStoppedError"), code) +
        " " +
        openTerminalMessage(),
      util.format(localize("teamstoolkit.localDebug.ngrokStoppedError"), code) +
        " " +
        openTerminalDisplayMessage()
    ),

  TunnelEndpointNotFoundError: (webServiceUrl: string) =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.TunnelEndpointNotFoundError,
      util.format(
        getDefaultString("teamstoolkit.localDebug.tunnelEndpointNotFoundError"),
        webServiceUrl
      ),
      util.format(localize("teamstoolkit.localDebug.tunnelEndpointNotFoundError", webServiceUrl))
    ),
  NgrokNotFoundError: () =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.NgrokNotFoundError,
      getDefaultString("teamstoolkit.localDebug.ngrokNotFoundError"),
      localize("teamstoolkit.localDebug.ngrokNotFoundError")
    ),
  NgrokInstallationError: (error?: any) =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.NgrokInstallationError,
      util.format(
        getDefaultString("teamstoolkit.localDebug.ngrokInstallationError"),
        error?.message ?? ""
      ),
      util.format(localize("teamstoolkit.localDebug.ngrokInstallationError"), error?.message ?? "")
    ),
  MultipleTunnelServiceError: () =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.MultipleTunnelServiceError,
      getDefaultString("teamstoolkit.localDebug.multipleTunnelServiceError"),
      localize("teamstoolkit.localDebug.multipleTunnelServiceError")
    ),
  NoTunnelServiceError: () =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.NoTunnelServiceError,
      getDefaultString("teamstoolkit.localDebug.noTunnelServiceError"),
      localize("teamstoolkit.localDebug.noTunnelServiceError")
    ),
  TunnelServiceNotStartedError: () =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.TunnelServiceNotStartedError,
      getDefaultString("teamstoolkit.localDebug.tunnelServiceNotStartedError"),
      localize("teamstoolkit.localDebug.tunnelServiceNotStartedError")
    ),
});
