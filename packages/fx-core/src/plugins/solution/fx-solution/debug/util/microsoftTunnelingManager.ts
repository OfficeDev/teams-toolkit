// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TunnelManagementHttpClient, TunnelRequestOptions } from "@vs/tunnels-management";
import {
  Tunnel,
  TunnelAccessControlEntryType,
  TunnelAccessScopes,
  TunnelProtocol,
  TunnelAccessControl,
  TunnelConnectionMode,
} from "@vs/tunnels-contracts";
import { TunnelRelayTunnelHost } from "@vs/tunnels-connections";
import { v2 } from "@microsoft/teamsfx-api";
import { PluginNames } from "../../constants";
const corePackage = require("../../../../../../package.json");

const TeamsfxTunnelsUserAgent = { name: corePackage.name, version: corePackage.name };
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

interface SolutionState {
  tunnelsClusterId?: string;
  tunnelsId?: string;
}

export class MicrosoftTunnelingManager {
  private tunnelManagementClient: TunnelManagementHttpClient;
  private tunnelHost: TunnelRelayTunnelHost | undefined;

  constructor(tunnnelsAccessToken: string) {
    this.tunnelManagementClient = new TunnelManagementHttpClient(
      TeamsfxTunnelsUserAgent,
      async () => `Bearer ${tunnnelsAccessToken}`
    );
  }

  /**
   * Create the tunnel/ports and start the tunnel host. Returns when the host is up and running.
   * @returns key value pairs of port and the public URL for that port.
   */
  public async startTunnelHost(
    ctx: v2.Context,
    localEnvInfo: v2.EnvInfoV2,
    ports: number[]
  ): Promise<Map<number, string>> {
    const tunnelInstance = await this.ensureTunnelExist(localEnvInfo, ports);
    await this.ensurePortsExist(tunnelInstance, ports);

    // TODO: Handle cases that host is already up. This happens when last host is not cleaned up (rare case).

    this.tunnelHost = new TunnelRelayTunnelHost(this.tunnelManagementClient);
    this.tunnelHost.trace = (level, eventId, msg, err) => {
      // TODO: handle verbose log by passing in log interface.
      ctx.logProvider.info("MicrosoftTunnelsSDK: " + msg);
    };

    // Start host. This is an non-blocking operations. It does not block on the host service.
    await this.tunnelHost.start(tunnelInstance);

    return await this.getPortEndpoints(tunnelInstance, ports);
  }

  public async stopTunnelHost(): Promise<void> {
    if (this.tunnelHost) {
      this.tunnelHost.dispose();
      this.tunnelHost = undefined;
    }
  }

  /**
   * Polling the tunnel until the host is up and return the tunnel endpoints for ports.
   */
  private async getPortEndpoints(
    tunnel: Tunnel,
    ports: number[],
    retryIntervalMillis = 1000,
    maxRetries = 10
  ): Promise<Map<number, string>> {
    const PortUriFormatPlaceholder = "{port}";
    let retried = 0;
    while (retried < maxRetries) {
      const tunnelResult = await this.tunnelManagementClient.getTunnel(tunnel);
      if (tunnelResult && tunnelResult.endpoints) {
        for (const endpoint of tunnelResult.endpoints) {
          const portUriFormat = endpoint.portUriFormat;
          if (
            endpoint.connectionMode === TunnelConnectionMode.TunnelRelay &&
            portUriFormat !== undefined
          ) {
            return new Map<number, string>(
              ports.map((port) => {
                // TODO: handle trailing "/" in somewhere but not here
                // url = url.replace(/\/+$/g, "");
                return [port, portUriFormat.replace(PortUriFormatPlaceholder, `${port}`)];
              })
            );
          }
        }
      }
      await sleep(retryIntervalMillis);
      retried++;
    }
    // TODO: Handle timeout error
    throw new Error("Not implemented: tunnel host startup timeout");
  }

  /**
   * Ensure tunnel exists. After this step:
   *  - the tunnel should exist in the service
   *  - the tunnel and cluster ID should exist in the config
   * @param localEnvInfo a reference to the local env state. This may be updated on return.
   * @returns the tunnel created or retrieved.
   */
  private async ensureTunnelExist(localEnvInfo: v2.EnvInfoV2, ports: number[]): Promise<Tunnel> {
    if (!localEnvInfo.state[PluginNames.SOLUTION]) {
      localEnvInfo.state[PluginNames.SOLUTION] = {};
    }
    // TODO: check type before converting to SolutionState
    const solutionState: SolutionState = localEnvInfo.state[PluginNames.SOLUTION];

    let tunnelInstance: Tunnel;
    if (solutionState.tunnelsClusterId && solutionState.tunnelsId) {
      const tunnelResult = await this.tunnelManagementClient.getTunnel({
        tunnelId: solutionState.tunnelsId,
        clusterId: solutionState.tunnelsClusterId,
      });
      if (tunnelResult === null) {
        // TODO: handle tunnel expiration
        throw new Error("not implemented");
      } else {
        tunnelInstance = tunnelResult;
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
      tunnelInstance = await this.tunnelManagementClient.createTunnel(
        tunnelRequest,
        tunnelRequestOptions
      );
      solutionState.tunnelsId = tunnelInstance.tunnelId;
      solutionState.tunnelsClusterId = tunnelInstance.clusterId;
    }
    return tunnelInstance;
  }

  /**
   * Ensure ports exists in the tunnel.
   * In most cases this is not needed. Rare cases are adding features or port creation failure in the last debug session.
   * After this step, the ports should exist in the service.
   */
  private async ensurePortsExist(tunnelInstance: Tunnel, ports: number[]): Promise<void> {
    // TODO: implement me.
  }
}

function sleep(millis: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), millis);
  });
}
