// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, err, FxError, LogProvider, Result } from "@microsoft/teamsfx-api";

import { TunnelRequestOptions } from "@vs/tunnels-management";
import {
  Tunnel,
  TunnelAccessControlEntryType,
  TunnelAccessScopes,
  TunnelProtocol,
  TunnelAccessControl,
} from "@vs/tunnels-contracts";
import {
  MicrosoftTunnelingNeedOnboardingError,
  MicrosoftTunnelingTimeoutError,
} from "./microsoftTunnelingError";
import { NotImplementedError } from "../../core/error";
import { MicrosoftTunnelingService } from "./microsoftTunnelingService";

const TeamsfxTunnelAccessControl: TunnelAccessControl = {
  entries: [
    {
      // Anyone can connect to the tunnel
      scopes: [TunnelAccessScopes.Connect],
      type: TunnelAccessControlEntryType.Anonymous,
      subjects: [],
    },
  ],
};

export interface TunnelInfo {
  tunnelClusterId?: string;
  tunnelId?: string;
}

export interface TunnelHostResult {
  tunnelInfo: TunnelInfo;
  portEndpoints: Map<number, string>;
}

export class MicrosoftTunnelingManager {
  private service: MicrosoftTunnelingService;

  constructor(getTunnelingAccessToken: () => Promise<string>, logProvider?: LogProvider) {
    this.service = new MicrosoftTunnelingService(getTunnelingAccessToken, logProvider);
  }

  public async checkOnboarded(): Promise<boolean> {
    // For onboarded users: Either 200 for tunnel creation success or 409 conflict
    // For not onboarded users: 403 Forbidden
    // If any other errors occur, assume onboarded and continue. Let it fail at the point where the action is really used.
    // https://global.rel.tunnels.api.visualstudio.com/api/swagger/index.html
    const createResult = await this.service.tryCreatingPermissionCheckTunnel();
    return !(
      createResult.isErr() && createResult.error instanceof MicrosoftTunnelingNeedOnboardingError
    );
  }

  /**
   * Create the tunnel/ports and start the tunnel host. If requested, re-use the existing tunnel info.
   * Returns when the host is up and running.
   * @returns key value pairs of port and the public URL for that port.
   */
  public async startTunnelHost(
    ports: number[],
    tunnelInfo?: TunnelInfo
  ): Promise<Result<TunnelHostResult, FxError>> {
    const result = await this._startTunnelHost(ports, tunnelInfo);
    globalPortEndpoints = result.isOk() ? ok(result.value.portEndpoints) : err(result.error);
    return result;
  }

  public async _startTunnelHost(
    ports: number[],
    tunnelInfo?: TunnelInfo
  ): Promise<Result<TunnelHostResult, FxError>> {
    const tunnelInstanceResult = await this.ensureTunnelExist(ports, tunnelInfo);
    if (tunnelInstanceResult.isErr()) {
      return err(tunnelInstanceResult.error);
    }
    const tunnelInstance = tunnelInstanceResult.value;
    const portResult = await this.ensurePortsExist(tunnelInstance, ports);
    if (portResult.isErr()) {
      return err(portResult.error);
    }

    // TODO: Handle cases that host is already up. This happens when last host is not cleaned up (rare case).

    // Start host. This is an non-blocking operations. It does not block on the host service.
    const hostResult = await this.service.hostStart(tunnelInstance);
    if (hostResult.isErr()) {
      return err(hostResult.error);
    }

    const portEndpointsResult = await this.getPortEndpoints(tunnelInstance, ports);
    if (portEndpointsResult.isErr()) {
      return err(portEndpointsResult.error);
    }
    return ok({
      portEndpoints: portEndpointsResult.value,
      tunnelInfo: {
        tunnelClusterId: tunnelInstance.clusterId,
        tunnelId: tunnelInstance.tunnelId,
      },
    });
  }

  public async stopTunnelHost(): Promise<Result<void, FxError>> {
    globalPortEndpoints = undefined;
    return await this.service.hostStop();
  }

  /**
   * Polling the tunnel until the host is up and return the tunnel endpoints for ports.
   */
  private async getPortEndpoints(
    tunnel: Tunnel,
    ports: number[],
    retryIntervalMillis = 1000,
    maxRetries = 10
  ): Promise<Result<Map<number, string>, FxError>> {
    const PortUriFormatPlaceholder = "{port}";
    let retried = 0;
    while (retried < maxRetries) {
      const tunnelResult = await this.service.getTunnel(tunnel);
      if (tunnelResult.isErr()) {
        return err(tunnelResult.error);
      }
      if (tunnelResult.value && tunnelResult.value.endpoints) {
        for (const endpoint of tunnelResult.value.endpoints) {
          const portUriFormat = endpoint.portUriFormat;
          if (
            // Currently there is a bug that endpoint.connectionMode is wrong value.
            // See the planning project issues/351
            /*endpoint.connectionMode === TunnelConnectionMode.TunnelRelay && */
            portUriFormat !== undefined
          ) {
            return ok(
              new Map<number, string>(
                ports.map((port) => {
                  return [port, portUriFormat.replace(PortUriFormatPlaceholder, `${port}`)];
                })
              )
            );
          }
        }
      }
      await sleep(retryIntervalMillis);
      retried++;
    }
    return err(new MicrosoftTunnelingTimeoutError());
  }

  /**
   * Ensure tunnel exists. After this step:
   *  - the tunnel should exist in the service
   *  - the tunnel and cluster ID should exist in the config
   * @param tunnelInfo If passed in, will re-use this tunnel.
   * @returns the tunnel created or retrieved.
   */
  private async ensureTunnelExist(
    ports: number[],
    tunnelInfo?: TunnelInfo
  ): Promise<Result<Tunnel, FxError>> {
    let tunnelInstance: Tunnel;
    if (tunnelInfo?.tunnelClusterId && tunnelInfo?.tunnelId) {
      const tunnelResult = await this.service.getTunnel({
        tunnelId: tunnelInfo.tunnelId,
        clusterId: tunnelInfo.tunnelClusterId,
      });
      if (tunnelResult.isErr()) {
        return err(tunnelResult.error);
      }
      if (tunnelResult.value === null) {
        // TODO: handle tunnel expiration
        return err(new NotImplementedError("Handle tunnel expiration"));
      } else {
        tunnelInstance = tunnelResult.value;
      }
    } else {
      const tunnelRequest: Tunnel = {
        ports: ports.map((port) => ({ portNumber: port, protocol: TunnelProtocol.Http })),
        accessControl: TeamsfxTunnelAccessControl,
      };
      const tunnelRequestOptions: TunnelRequestOptions = {
        tokenScopes: [TunnelAccessScopes.Host, TunnelAccessScopes.Connect],
        includePorts: true,
      };
      const tunnelResult = await this.service.createTunnel(tunnelRequest, tunnelRequestOptions);
      if (tunnelResult.isErr()) {
        return err(tunnelResult.error);
      }
      tunnelInstance = tunnelResult.value;
    }
    return ok(tunnelInstance);
  }

  /**
   * Ensure ports exists in the tunnel.
   * In most cases this is not needed. Rare cases are adding features or port creation failure in the last debug session.
   * After this step, the ports should exist in the service.
   */
  private async ensurePortsExist(
    tunnelInstance: Tunnel,
    ports: number[]
  ): Promise<Result<void, FxError>> {
    // TODO: implement me.
    return ok(undefined);
  }
}

function sleep(millis: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), millis);
  });
}

// Tunnels are managed in vscode/cli task and tunnel endpoints are read in solution.
// So use a global variable to share between task and solution.
let globalPortEndpoints: Result<Map<number, string>, FxError> | undefined;
export function getCurrentTunnelPorts(): Result<Map<number, string>, FxError> | undefined {
  return globalPortEndpoints;
}
