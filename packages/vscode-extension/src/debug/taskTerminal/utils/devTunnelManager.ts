/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */
import { TunnelRelayTunnelHost } from "@microsoft/dev-tunnels-connections";
import { Tunnel } from "@microsoft/dev-tunnels-contracts";
import {
  TunnelManagementHttpClient,
  TunnelRequestOptions,
} from "@microsoft/dev-tunnels-management";
import { Trace } from "@microsoft/dev-tunnels-ssh";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../telemetry/extTelemetryEvents";
import { TunnelError } from "../baseTunnelTaskTerminal";
import { UserError, SystemError } from "@microsoft/teamsfx-api";

const DevTunnelOperationName = Object.freeze({
  create: "create",
  delete: "delete",
  get: "get",
  list: "list",
  startHost: "start-host",
});

export class DevTunnelManager {
  private telemetryProperties: { [key: string]: string };
  constructor(private tunnelManagementClientImpl: TunnelManagementHttpClient) {
    this.telemetryProperties = {};
  }

  public setTelemetryProperties(telemetryProperties: { [key: string]: string }): void {
    this.telemetryProperties = telemetryProperties;
  }

  public async createTunnel(tunnel: Tunnel, options?: TunnelRequestOptions): Promise<Tunnel> {
    return await this.devTunnelOperation(DevTunnelOperationName.create, async () => {
      try {
        return await this.tunnelManagementClientImpl.createTunnel(tunnel, options);
      } catch (error: any) {
        if (error?.response?.data?.title === "Resource limit exceeded.") {
          throw TunnelError.TunnelResourceLimitExceededError(error);
        }
        throw error;
      }
    });
  }

  public async deleteTunnel(tunnel: Tunnel, options?: TunnelRequestOptions): Promise<boolean> {
    return await this.devTunnelOperation(DevTunnelOperationName.delete, async () => {
      return await this.tunnelManagementClientImpl.deleteTunnel(tunnel, options);
    });
  }

  public async getTunnel(tunnel: Tunnel, options?: TunnelRequestOptions): Promise<Tunnel | null> {
    return await this.devTunnelOperation(DevTunnelOperationName.get, async () => {
      return await this.tunnelManagementClientImpl.getTunnel(tunnel, options);
    });
  }

  public async listTunnels(
    clusterId?: string,
    domain?: string,
    options?: TunnelRequestOptions
  ): Promise<Tunnel[]> {
    return await this.devTunnelOperation(DevTunnelOperationName.list, async () => {
      return await this.tunnelManagementClientImpl.listTunnels(clusterId, domain, options);
    });
  }

  public async startHost(tunnel: Tunnel, trace: Trace): Promise<TunnelRelayTunnelHost> {
    return await this.devTunnelOperation(DevTunnelOperationName.startHost, async () => {
      const host = new TunnelRelayTunnelHost(this.tunnelManagementClientImpl);
      host.trace = trace;
      await host.start(tunnel);
      return host;
    });
  }

  private async devTunnelOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugDevTunnelOperationStart, {
        [TelemetryProperty.DebugDevTunnelOperationName]: operationName,
        ...this.telemetryProperties,
      });
      const res = await operation();
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.DebugDevTunnelOperation, {
        [TelemetryProperty.DebugDevTunnelOperationName]: operationName,
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
        ...this.telemetryProperties,
      });
      return res;
    } catch (error: any) {
      const operationError =
        error instanceof UserError || error instanceof SystemError
          ? error
          : TunnelError.DevTunnelOperationError(operationName, error);
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.DebugDevTunnelOperation, operationError, {
        [TelemetryProperty.DebugDevTunnelOperationName]: operationName,
        ...this.telemetryProperties,
      });
      throw operationError;
    }
  }
}
