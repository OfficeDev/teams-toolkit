/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import * as vscode from "vscode";
import { TunnelRelayTunnelHost } from "@microsoft/dev-tunnels-connections";
import { Tunnel, TunnelAccessControlEntryType, TunnelPort } from "@microsoft/dev-tunnels-contracts";
import {
  TunnelManagementHttpClient,
  TunnelRequestOptions,
} from "@microsoft/dev-tunnels-management";
import { err, FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import { TaskDefaultValue, TunnelType } from "@microsoft/teamsfx-core";
import VsCodeLogInstance from "../../commonlib/log";
import { tools } from "../../handlers";
import { TelemetryProperty } from "../../telemetry/extTelemetryEvents";
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

const DevTunnelScopes = ["46da2f7e-b5ef-422a-88d4-2a7f9de6a0b2/.default"];
const TunnelManagementUserAgent = { name: "Teams-Toolkit" };
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
  private readonly tunnelManagementClientImpl: TunnelManagementHttpClient;
  private readonly devTunnelStateManager: DevTunnelStateManager;
  private tunnel: Tunnel | undefined;
  private isOutputSummary: boolean;
  private cancel: (() => void) | undefined;

  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition, 1);
    this.args = taskDefinition.args as IDevTunnelArgs;
    this.isOutputSummary = false;
    this.tunnelManagementClientImpl = new TunnelManagementHttpClient(
      TunnelManagementUserAgent,
      async () => {
        const tokenRes = await tools.tokenProvider.m365TokenProvider.getAccessToken({
          scopes: DevTunnelScopes,
          showDialog: true,
        });

        if (tokenRes.isErr()) {
          return null;
        }
        const res = `Bearer ${tokenRes.value}`;
        return res;
      }
    );
    this.devTunnelStateManager = DevTunnelStateManager.create();
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
        await this.tunnelManagementClientImpl.deleteTunnel(deleteTunnel);
        await this.devTunnelStateManager.deleteTunnelState({
          tunnelId: deleteTunnel.tunnelId,
          clusterId: deleteTunnel.clusterId,
        });
      }

      if (this.cancel) {
        this.cancel();
      }
      super.stop(error);
    }
  }

  protected async _do(): Promise<Result<Void, FxError>> {
    await this.outputStartMessage(devTunnelDisplayMessages);
    await this.outputStartDevTunnelStepMessage();
    await this.resolveArgs(this.args);
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

        const tunnelInstance = await this.tunnelManagementClientImpl.getTunnel({
          tunnelId: devTunnelState.tunnelId,
          clusterId: devTunnelState.clusterId,
        });
        if (!tunnelInstance) {
          await this.devTunnelStateManager.deleteTunnelState(devTunnelState);
        }
        if (tunnelInstance?.tags?.includes(DevTunnelTag)) {
          await this.tunnelManagementClientImpl.deleteTunnel(tunnelInstance);
          await this.devTunnelStateManager.deleteTunnelState(devTunnelState);
        }
      } catch {
        // Do nothing if delete existing tunnel failed.
      }
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
      const tunnelInstance = await this.tunnelManagementClientImpl.createTunnel(
        tunnel,
        tunnelRequestOptions
      );

      this.tunnel = tunnelInstance;

      if (!tunnelInstance.ports) {
        return err(TunnelError.StartTunnelError());
      }

      const host = new TunnelRelayTunnelHost(this.tunnelManagementClientImpl);
      host.trace = (level, eventId, msg, err) => {
        if (msg) {
          this.writeEmitter.fire(`${msg}\r\n`);
        }
        if (err) {
          this.writeEmitter.fire(`${err}\r\n`);
        }
      };
      await host.start(tunnelInstance);

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
          };
        }),
        saveEnvRes.value
      );
      return ok(Void);
    } catch (error: any) {
      return err(TunnelError.StartTunnelError(error));
    }
  }

  protected async resolveArgs(args: IDevTunnelArgs): Promise<void> {
    await super.resolveArgs(args);
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
        !(Object.values(Protocol) as string[]).includes(port.protocol)
      ) {
        throw BaseTaskTerminal.taskDefinitionError(`args.ports[${i}].protocol`);
      }

      if (port.access) {
        if (
          typeof port.access !== "string" ||
          !(Object.values(Access) as string[]).includes(port.access)
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
              Object.values(TaskDefaultValue.checkPrerequisites.ports).map((p) => `${p}`)
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
