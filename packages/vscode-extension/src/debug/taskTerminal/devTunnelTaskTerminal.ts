/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import * as vscode from "vscode";
import { TunnelRelayTunnelHost } from "@microsoft/dev-tunnels-connections";
import {
  Tunnel,
  TunnelAccessControlEntry,
  TunnelAccessControlEntryType,
} from "@microsoft/dev-tunnels-contracts";
import {
  TunnelManagementHttpClient,
  TunnelRequestOptions,
} from "@microsoft/dev-tunnels-management";
import { err, FxError, ok, Result, UserError, Void } from "@microsoft/teamsfx-api";
import { TaskDefaultValue, TunnelType } from "@microsoft/teamsfx-core";

import VsCodeLogInstance from "../../commonlib/log";
import { ExtensionErrors, ExtensionSource } from "../../error";
import { tools } from "../../handlers";
import { TelemetryProperty } from "../../telemetry/extTelemetryEvents";
import { devTunnelDisplayMessages, TunnelDisplayMessages } from "../constants";
import { maskValue } from "../localTelemetryReporter";
import { BaseTaskTerminal } from "./baseTaskTerminal";
import {
  BaseTunnelTaskTerminal,
  IBaseTunnelArgs,
  OutputInfo,
  TunnelError,
} from "./baseTunnelTaskTerminal";

const DevTunnelScopes = ["46da2f7e-b5ef-422a-88d4-2a7f9de6a0b2/.default"];
const TunnelManagementUserAgent = { name: "Teams Toolkit" };
const DevTunnelTimeout = 2147483647; // 2^31-1, max timeout ms

const DevTunnelTag = "TeamsToolkitCreatedTag";

export interface IDevTunnelArgs extends IBaseTunnelArgs {
  port: number;
  protocol: string;
  access?: string;
  // TODO: add tunnel name into dev tunnel args
  // name?: string;
  output?: {
    endpoint?: string;
    domain?: string;
    id?: string;
  };
}

const Protocol = Object.freeze({
  http: "http",
  https: "https",
});

const Access = Object.freeze({
  public: "public",
  // TODO: add private and org level
  // private: "private",
  // org: "org"
});

export class DevTunnelTaskTerminal extends BaseTunnelTaskTerminal {
  protected readonly args: IDevTunnelArgs;
  private readonly tunnelManagementClientImpl: TunnelManagementHttpClient;
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
      }

      if (this.cancel) {
        this.cancel();
      }
      super.stop(error);
    }
  }

  protected async _do(): Promise<Result<Void, FxError>> {
    await this.outputStartMessage(devTunnelDisplayMessages);
    await this.outputStartDevTunnelStepMessage(devTunnelDisplayMessages);
    await this.resolveArgs(this.args);
    await this.deleteExistingTunnel();
    const res = await this.start();
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
    try {
      if (!this.args?.output?.id) {
        return;
      }

      const envsRes = await this.readPropertiesFromEnv(this.args.env);
      if (envsRes.isErr()) {
        return;
      }
      const id = envsRes.value[this.args.output.id];

      const idArr = id?.split(".");
      if (!idArr || idArr.length !== 2) {
        return;
      }

      const tunnelInstance = await this.tunnelManagementClientImpl.getTunnel({
        tunnelId: idArr[0],
        clusterId: idArr[1],
      });

      if (tunnelInstance?.tags?.includes(DevTunnelTag)) {
        await this.tunnelManagementClientImpl.deleteTunnel(tunnelInstance);
      }
    } catch {
      // Do nothing if delete existing tunnel failed.
    }
  }

  private async start(): Promise<Result<Void, FxError>> {
    try {
      const tunnelAccessControlEntry: TunnelAccessControlEntry = {
        type:
          this.args.access === Access.public
            ? TunnelAccessControlEntryType.Anonymous
            : TunnelAccessControlEntryType.None,
        subjects: [],
        scopes: ["connect"],
      };

      const tunnel: Tunnel = {
        ports: [{ portNumber: this.args.port, protocol: this.args.protocol }],
        accessControl: {
          entries: [tunnelAccessControlEntry],
        },
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
      const tunnelDistUri = host.tunnel?.ports?.[0].portForwardingUris?.[0];
      const tunnelDisplayId = `${host.tunnel?.tunnelId}.${host.tunnel?.clusterId}`;
      if (!host.tunnel || !tunnelDistUri || !tunnelDisplayId) {
        return err(DevTunnelError.DevTunnelStartError());
      }
      this.tunnel = host.tunnel;
      const saveEnvRes = await this.saveOutputToEnv(tunnelDisplayId, tunnelDistUri);
      if (saveEnvRes.isErr()) {
        return err(saveEnvRes.error);
      }

      this.isOutputSummary = true;
      await this.outputSuccessSummary(
        devTunnelDisplayMessages,
        { src: `${this.args.protocol}://localhost:${this.args.port}`, dest: tunnelDistUri },
        saveEnvRes.value
      );
      return ok(Void);
    } catch (error: any) {
      return err(DevTunnelError.DevTunnelStartError(error));
    }
  }

  protected async resolveArgs(args: IDevTunnelArgs): Promise<void> {
    await super.resolveArgs(args);
    if (!args.type) {
      throw BaseTaskTerminal.taskDefinitionError("args.type");
    }

    if (typeof args.port !== "number") {
      throw BaseTaskTerminal.taskDefinitionError("args.port");
    }

    if (
      typeof args.protocol !== "string" ||
      !(Object.values(Protocol) as string[]).includes(args.protocol)
    ) {
      throw BaseTaskTerminal.taskDefinitionError("args.protocol");
    }

    if (args.access) {
      if (
        typeof args.access !== "string" ||
        !(Object.values(Access) as string[]).includes(args.access)
      ) {
        throw BaseTaskTerminal.taskDefinitionError("args.access");
      }
    }

    if (typeof args.output?.id !== "undefined" && typeof args.output?.id !== "string") {
      throw BaseTaskTerminal.taskDefinitionError("args.output.id");
    }
  }

  protected generateTelemetries(): { [key: string]: string } {
    return {
      [TelemetryProperty.DebugTaskId]: this.taskTerminalId,
      [TelemetryProperty.DebugTaskArgs]: JSON.stringify({
        type: maskValue(this.args.type, Object.values(TunnelType)),
        port: maskValue(
          this.args.port?.toString(),
          Object.values(TaskDefaultValue.checkPrerequisites.ports).map((p) => `${p}`)
        ),
        protocol: maskValue(this.args.protocol, Object.values(Protocol)),
        access: maskValue(this.args.access, Object.values(Access)),
        env: maskValue(this.args.env, [TaskDefaultValue.env]),
        output: {
          endpoint: maskValue(this.args.output?.endpoint, [
            TaskDefaultValue.startLocalTunnel.output.endpoint,
          ]),
          domain: maskValue(this.args.output?.domain, [
            TaskDefaultValue.startLocalTunnel.output.domain,
          ]),
          id: maskValue(this.args.output?.id, [TaskDefaultValue.startLocalTunnel.output.id]),
        },
      }),
    };
  }

  private async saveOutputToEnv(
    id: string,
    endpoint: string
  ): Promise<Result<OutputInfo, FxError>> {
    try {
      const url = new URL(endpoint);
      const envVars: { [key: string]: string } = {};
      if (this.args?.output?.endpoint) {
        envVars[this.args.output.endpoint] = url.origin;
      }
      if (this.args?.output?.domain) {
        envVars[this.args.output.domain] = url.hostname;
      }
      if (this.args?.output?.id) {
        envVars[this.args.output.id] = id;
      }

      return this.savePropertiesToEnv(this.args.env, envVars);
    } catch (error: any) {
      return err(TunnelError.TunnelEnvError(error));
    }
  }

  private async outputStartDevTunnelStepMessage(
    tunnelDisplayMessages: TunnelDisplayMessages
  ): Promise<void> {
    VsCodeLogInstance.outputChannel.appendLine(
      `${this.step.getPrefix()} ${tunnelDisplayMessages.startMessage} ... `
    );
    VsCodeLogInstance.outputChannel.appendLine("");

    await this.progressHandler.next(tunnelDisplayMessages.startMessage);
  }
}

const DevTunnelError = Object.freeze({
  DevTunnelStartError: (error?: any) =>
    new UserError(
      ExtensionSource,
      ExtensionErrors.DevTunnelStartError,
      // TODO: add error message
      "",
      ""
    ),
});
