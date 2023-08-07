// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import * as vscode from "vscode";
import { Tunnel, TunnelAccessControlEntryType, TunnelPort } from "@microsoft/dev-tunnels-contracts";
import {
  TunnelManagementHttpClient,
  TunnelRequestOptions,
} from "@microsoft/dev-tunnels-management";
import { TraceLevel } from "@microsoft/dev-tunnels-ssh";
import { err, FxError, ok, Result, Void, UserError, SystemError } from "@microsoft/teamsfx-api";
import { TaskDefaultValue, TunnelType } from "@microsoft/teamsfx-core";
import VsCodeLogInstance from "../../commonlib/log";
import { VS_CODE_UI } from "../../extension";
import { tools } from "../../handlers";
import { ExtTelemetry } from "../../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../telemetry/extTelemetryEvents";
import { devTunnelDisplayMessages } from "../constants";
import { maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import {
  BaseTunnelTaskTerminal,
  IBaseTunnelArgs,
  OutputInfo,
  TunnelError,
} from "./baseTunnelTaskTerminal";
import { DevTunnelStateManager } from "./utils/devTunnelStateManager";
import { DevTunnelManager } from "./utils/devTunnelManager";
import { ExtensionErrors } from "../../error";
import { FeatureFlags, isFeatureFlagEnabled } from "../../utils/commonUtils";

const DevTunnelScopes = ["46da2f7e-b5ef-422a-88d4-2a7f9de6a0b2/.default"];
const TunnelManagementUserAgent = { name: "Teams-Toolkit" };
const TunnelManagementTestUserAgent = { name: "Teams-Toolkit-Test" };

const DevTunnelTimeout = 2147483647; // 2^31-1, max timeout ms

const DevTunnelTag = "TeamsToolkitCreatedTag";

export interface IDevTunnelArgs extends IBaseTunnelArgs {
  // TODO: add tunnel name into dev tunnel args
  // name?: string;
  ports: {
    portNumber: number;
    protocol: string;
    access?: string;
    writeToEnvironmentFile?: DevTunnelOutput;
  }[];
}

export type TunnelPortWithOutput = {
  protocol: string;
  portNumber: number;
  portForwardingUri: string;
  writeToEnvironmentFile?: DevTunnelOutput;
};

interface DevTunnelOutput {
  endpoint?: string;
  domain?: string;
}

const Protocol = Object.freeze({
  http: "http",
  https: "https",
});

const Access = Object.freeze({
  public: "public",
  private: "private",
  // TODO: add org level
  // org: "org"
});

export class DevTunnelTaskTerminal extends BaseTunnelTaskTerminal {
  protected readonly args: IDevTunnelArgs;
  protected cancel: (() => void) | undefined;
  private readonly devTunnelManager: DevTunnelManager;
  private readonly devTunnelStateManager: DevTunnelStateManager;
  private tunnel: Tunnel | undefined;
  private isOutputSummary: boolean;

  constructor(
    taskDefinition: vscode.TaskDefinition,
    devTunnelManager: DevTunnelManager,
    devTunnelStateManager: DevTunnelStateManager
  ) {
    super(taskDefinition, 1);
    this.args = taskDefinition.args as IDevTunnelArgs;
    this.isOutputSummary = false;
    this.devTunnelManager = devTunnelManager;
    this.devTunnelStateManager = devTunnelStateManager;
  }

  static create(taskDefinition: vscode.TaskDefinition): DevTunnelTaskTerminal {
    const tunnelManagementClientImpl = new TunnelManagementHttpClient(
      isFeatureFlagEnabled(FeatureFlags.DevTunnelTest)
        ? TunnelManagementTestUserAgent
        : TunnelManagementUserAgent,
      async () => {
        const tokenRes = await tools.tokenProvider.m365TokenProvider.getAccessToken({
          scopes: DevTunnelScopes,
          showDialog: true,
        });

        if (tokenRes.isErr()) {
          throw tokenRes.error;
        }
        const res = `Bearer ${tokenRes.value}`;
        return res;
      }
    );
    const devTunnelManager = new DevTunnelManager(tunnelManagementClientImpl);
    const devTunnelStateManager = DevTunnelStateManager.create();
    return new DevTunnelTaskTerminal(taskDefinition, devTunnelManager, devTunnelStateManager);
  }

  async stop(error?: any): Promise<void> {
    if (DevTunnelTaskTerminal.tunnelTaskTerminals.has(this.taskTerminalId)) {
      DevTunnelTaskTerminal.tunnelTaskTerminals.delete(this.taskTerminalId);
      if (!this.isOutputSummary) {
        this.isOutputSummary = true;
        await this.outputFailureSummary(devTunnelDisplayMessages, error);
      }
      if (this.tunnel) {
        const deleteTunnel = this.tunnel;
        this.tunnel = undefined;
        await this.devTunnelManager.deleteTunnel(deleteTunnel);
        await this.devTunnelStateManager.deleteTunnelState({
          tunnelId: deleteTunnel.tunnelId,
          clusterId: deleteTunnel.clusterId,
        });
      }

      if (this.cancel) {
        this.cancel();
      }
      await super.stop(error);
    }
  }

  protected async _do(): Promise<Result<Void, FxError>> {
    this.devTunnelManager.setTelemetryProperties({
      [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
    });
    await this.outputStartMessage(devTunnelDisplayMessages);
    await this.outputStartDevTunnelStepMessage();
    this.resolveArgs(this.args);
    await this.deleteExistingTunnel();
    const res = await this.start(this.args);
    if (res.isOk()) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve();
        }, DevTunnelTimeout);
        this.cancel = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    }
    return res;
  }

  private async deleteExistingTunnel(): Promise<void> {
    const devTunnelStates = await this.devTunnelStateManager.listDevTunnelStates();
    for (const devTunnelState of devTunnelStates) {
      try {
        if (devTunnelState.sessionId === vscode.env.sessionId) {
          continue;
        }

        const tunnelInstance = await this.devTunnelManager.getTunnel({
          tunnelId: devTunnelState.tunnelId,
          clusterId: devTunnelState.clusterId,
        });
        if (tunnelInstance?.tags?.includes(DevTunnelTag)) {
          await this.devTunnelManager.deleteTunnel(tunnelInstance);
        }
      } catch {
        // Do nothing if delete existing tunnel failed.
      }
      await this.devTunnelStateManager.deleteTunnelState(devTunnelState);
    }
  }

  private async deleteAllTunnelsMessage(): Promise<void> {
    const tunnels = await this.devTunnelManager.listTunnels();
    const teamsToolkitTunnels = tunnels.filter((t) => t?.tags?.includes(DevTunnelTag));

    if (teamsToolkitTunnels.length === 0) {
      return;
    }
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugDevTunnelCleanNotificationStart, {
      [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
      [TelemetryProperty.DebugDevTunnelNum]: `${teamsToolkitTunnels.length}`,
    });
    VsCodeLogInstance.outputChannel.show();
    await VsCodeLogInstance.info(devTunnelDisplayMessages.devTunnelListMessage());
    const tableHeader =
      "Tunnel ID".padEnd(20, " ") +
      "Hosts Connections".padEnd(20, " ") +
      "Tags".padEnd(30, " ") +
      "Created".padEnd(30, " ");

    VsCodeLogInstance.outputChannel.appendLine(tableHeader);
    for (const tunnel of teamsToolkitTunnels) {
      const line =
        `${tunnel.tunnelId ?? ""}.${tunnel.clusterId ?? ""}`.padEnd(20, " ") +
        `${tunnel.endpoints?.length ?? "0"}`.padEnd(20, " ") +
        `${tunnel?.tags?.join(",") ?? ""}`.padEnd(30, " ") +
        `${tunnel.created?.toISOString() ?? ""}`.padEnd(30, " ");
      VsCodeLogInstance.outputChannel.appendLine(line);
    }
    await VS_CODE_UI.showMessage(
      "info",
      devTunnelDisplayMessages.devTunnelLimitExceededMessage(),
      false,
      devTunnelDisplayMessages.devTunnelLimitExceededAnswerDelete(),
      devTunnelDisplayMessages.devTunnelLimitExceededAnswerCancel()
    ).then(async (result) => {
      if (
        result.isOk() &&
        result.value === devTunnelDisplayMessages.devTunnelLimitExceededAnswerDelete()
      ) {
        try {
          for (const tunnel of teamsToolkitTunnels) {
            await this.devTunnelManager.deleteTunnel(tunnel);
            await VsCodeLogInstance.info(
              devTunnelDisplayMessages.deleteDevTunnelMessage(
                `${tunnel.tunnelId ?? ""}.${tunnel.clusterId ?? ""}`
              )
            );
          }
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugDevTunnelCleanNotification, {
            [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
            [TelemetryProperty.DebugDevTunnelNum]: `${teamsToolkitTunnels.length}`,
            [TelemetryProperty.Success]: TelemetrySuccess.Yes,
          });
        } catch {
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugDevTunnelCleanNotification, {
            [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
            [TelemetryProperty.DebugDevTunnelNum]: `${teamsToolkitTunnels.length}`,
            [TelemetryProperty.Success]: TelemetrySuccess.No,
          });
        }
      } else {
        return undefined;
      }
    });
  }

  private async createTunnelWithCleanMessage(
    tunnel: Tunnel,
    options?: TunnelRequestOptions
  ): Promise<Tunnel> {
    try {
      return await this.devTunnelManager.createTunnel(tunnel, options);
    } catch (error: any) {
      if (
        error instanceof UserError &&
        error.name === ExtensionErrors.TunnelResourceLimitExceededError
      ) {
        this.deleteAllTunnelsMessage().catch(() => {
          // Do nothing if delete existing tunnel failed.
        });
      }
      throw error;
    }
  }

  private async start(args: IDevTunnelArgs): Promise<Result<Void, FxError>> {
    try {
      const tunnel: Tunnel = {
        ports: Object.values(args.ports).map((p) => {
          return {
            portNumber: p.portNumber,
            protocol: p.protocol,
            accessControl: {
              entries:
                p.access === Access.public
                  ? [
                      {
                        type: TunnelAccessControlEntryType.Anonymous,
                        subjects: [],
                        scopes: ["connect"],
                      },
                    ]
                  : [],
            },
          };
        }),
        tags: [DevTunnelTag],
      };
      const tunnelRequestOptions: TunnelRequestOptions = {
        tokenScopes: ["host"],
        includePorts: true,
      };
      const tunnelInstance = await this.createTunnelWithCleanMessage(tunnel, tunnelRequestOptions);

      this.tunnel = tunnelInstance;

      if (!tunnelInstance.ports) {
        return err(TunnelError.StartTunnelError());
      }

      const host = await this.devTunnelManager.startHost(
        tunnelInstance,
        (level, eventId, msg, err) => {
          if (msg && level !== TraceLevel.Verbose) {
            this.writeEmitter.fire(`${msg}\r\n`);
          }
          if (err) {
            this.writeEmitter.fire(`${err.message}\r\n`);
          }
        }
      );

      const extendedTunnelPorts = this.validateAndExtendTunnelPorts(
        args,
        host?.tunnel?.ports ?? []
      );
      await this.devTunnelStateManager.setTunnelState({
        tunnelId: tunnelInstance.tunnelId,
        clusterId: tunnelInstance.clusterId,
        sessionId: vscode.env.sessionId,
      });
      const saveEnvRes = await this.saveTunnelToEnv(args.env, extendedTunnelPorts);
      if (saveEnvRes.isErr()) {
        return err(saveEnvRes.error);
      }

      this.isOutputSummary = true;
      await this.outputSuccessSummary(
        devTunnelDisplayMessages,
        extendedTunnelPorts.map((port) => {
          return {
            src: `${port.protocol}://localhost:${port.portNumber}`,
            dest: port.portForwardingUri,
            keys: [
              port.writeToEnvironmentFile?.domain,
              port.writeToEnvironmentFile?.endpoint,
            ].filter((k): k is string => !!k),
          };
        }),
        saveEnvRes.value
      );
      return ok(Void);
    } catch (error: any) {
      if (error instanceof UserError || error instanceof SystemError) return err(error);
      return err(TunnelError.StartTunnelError(error));
    }
  }

  protected resolveArgs(args: IDevTunnelArgs): void {
    super.resolveArgs(args);
    if (args.type !== TunnelType.devTunnel) {
      throw BaseTaskTerminal.taskDefinitionError("args.type");
    }

    if (typeof args.ports !== "object" || !Array.isArray(args.ports)) {
      throw BaseTaskTerminal.taskDefinitionError("args.ports");
    }

    const portNum = args.ports.length;
    for (let i = 0; i < portNum; ++i) {
      const port = args.ports[i];

      if (typeof port !== "object") {
        throw BaseTaskTerminal.taskDefinitionError(`args.ports[${i}]`);
      }

      if (typeof port.portNumber !== "number") {
        throw BaseTaskTerminal.taskDefinitionError(`args.ports[${i}].portNumber`);
      }

      if (
        typeof port.protocol !== "string" ||
        !Object.values(Protocol).includes(port.protocol as any)
      ) {
        throw BaseTaskTerminal.taskDefinitionError(`args.ports[${i}].protocol`);
      }

      if (port.access) {
        if (
          typeof port.access !== "string" ||
          !Object.values(Access).includes(port.access as any)
        ) {
          throw BaseTaskTerminal.taskDefinitionError(`args.ports[${i}].access`);
        }
      }

      if (
        typeof port.writeToEnvironmentFile !== "undefined" &&
        typeof port.writeToEnvironmentFile !== "object"
      ) {
        throw BaseTaskTerminal.taskDefinitionError(`args.ports[${i}].writeToEnvironmentFile`);
      }

      if (
        typeof port.writeToEnvironmentFile?.endpoint !== "undefined" &&
        typeof port.writeToEnvironmentFile?.endpoint !== "string"
      ) {
        throw BaseTaskTerminal.taskDefinitionError(
          `args.ports[${i}].writeToEnvironmentFile.endpoint`
        );
      }

      if (
        typeof port.writeToEnvironmentFile?.domain !== "undefined" &&
        typeof port.writeToEnvironmentFile?.domain !== "string"
      ) {
        throw BaseTaskTerminal.taskDefinitionError(
          `args.ports[${i}].writeToEnvironmentFile.domain`
        );
      }
    }
  }

  protected generateTelemetries(): { [key: string]: string } {
    try {
      const debugTaskArgs = {
        type: maskValue(this.args.type, Object.values(TunnelType)),
        ports: this.args.ports.map((port) => {
          return {
            portNumber: maskValue(
              port.portNumber.toString(),
              Object.values(TaskDefaultValue.checkPrerequisites.ports).map((p) => String(p))
            ),
            protocol: maskValue(port.protocol, Object.values(Protocol)),
            access: maskValue(port.access, Object.values(Access)),
            writeToEnvironmentFile: {
              endpoint: maskValue(port.writeToEnvironmentFile?.endpoint, [
                TaskDefaultValue.startLocalTunnel.writeToEnvironmentFile.endpoint,
              ]),
              domain: maskValue(port.writeToEnvironmentFile?.domain, [
                TaskDefaultValue.startLocalTunnel.writeToEnvironmentFile.domain,
              ]),
            },
          };
        }),
        env: maskValue(this.args.env, [TaskDefaultValue.env]),
      };

      return {
        [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
        [TelemetryProperty.DebugTaskArgs]: JSON.stringify(debugTaskArgs),
      };
    } catch {
      return {
        [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
      };
    }
  }

  protected async saveTunnelToEnv(
    env: string | undefined,
    tunnelPorts: TunnelPortWithOutput[]
  ): Promise<Result<OutputInfo, FxError>> {
    try {
      const envVars: { [key: string]: string } = {};
      for (const tunnelPort of tunnelPorts) {
        const url = new URL(tunnelPort.portForwardingUri);
        if (tunnelPort?.writeToEnvironmentFile?.endpoint) {
          envVars[tunnelPort.writeToEnvironmentFile.endpoint] = url.origin;
        }
        if (tunnelPort?.writeToEnvironmentFile?.domain) {
          envVars[tunnelPort.writeToEnvironmentFile.domain] = url.hostname;
        }
      }

      return this.savePropertiesToEnv(env, envVars);
    } catch (error: any) {
      return err(TunnelError.TunnelEnvError(error));
    }
  }

  protected validateAndExtendTunnelPorts(
    args: IDevTunnelArgs,
    tunnelPorts: TunnelPort[]
  ): TunnelPortWithOutput[] {
    const res: TunnelPortWithOutput[] = [];
    for (const portInfo of args.ports) {
      let isSuccess = false;
      for (const tunnelPort of tunnelPorts) {
        if (
          portInfo.portNumber === tunnelPort.portNumber &&
          portInfo.protocol === tunnelPort.protocol &&
          tunnelPort.portForwardingUris &&
          tunnelPort.portForwardingUris.length > 0
        ) {
          isSuccess = true;
          res.push({
            protocol: tunnelPort.protocol,
            portNumber: tunnelPort.portNumber,
            portForwardingUri: tunnelPort.portForwardingUris[0],
            writeToEnvironmentFile: portInfo.writeToEnvironmentFile,
          });
        }
      }
      if (!isSuccess) {
        throw TunnelError.StartTunnelError();
      }
    }
    return res;
  }

  private async outputStartDevTunnelStepMessage(): Promise<void> {
    VsCodeLogInstance.outputChannel.appendLine(
      `${this.step.getPrefix()} ${devTunnelDisplayMessages.startDevTunnelMessage()} ... `
    );
    VsCodeLogInstance.outputChannel.appendLine("");
    this.writeEmitter.fire(
      `${devTunnelDisplayMessages.createDevTunnelTerminalMessage(DevTunnelTag)}\r\n`
    );

    await this.progressHandler.next(devTunnelDisplayMessages.startDevTunnelMessage());
  }
}
