// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel, LogProvider } from "@microsoft/teamsfx-api";

import { TunnelManagementHttpClient, TunnelRequestOptions } from "@vs/tunnels-management";
import {
  Tunnel,
  TunnelAccessControlEntryType,
  TunnelAccessScopes,
  TunnelProtocol,
  TunnelAccessControl,
} from "@vs/tunnels-contracts";
import { TunnelRelayTunnelHost } from "@vs/tunnels-connections";
import { TraceLevel } from "@vs/vs-ssh";
// Need to use require instead of import to prevent packaging folder structure issue.
const corePackage = require("../../../../../../package.json");

const TeamsfxTunnelsUserAgent = { name: corePackage.name, version: corePackage.version };
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
  tunnelsClusterId?: string;
  tunnelsId?: string;
}

export interface TunnelHostResult {
  tunnelInfo: TunnelInfo;
  portEndpoints: Map<number, string>;
}

export class MicrosoftTunnelingManager {
  private tunnelManagementClient: TunnelManagementHttpClient;
  private tunnelHost?: TunnelRelayTunnelHost;

  constructor(getTunnelsAccessToken: () => Promise<string>) {
    this.tunnelManagementClient = new TunnelManagementHttpClient(
      TeamsfxTunnelsUserAgent,
      async () => `Bearer ${await getTunnelsAccessToken()}`
    );
  }

  /**
   * Create the tunnel/ports and start the tunnel host. If requested, re-use the existing tunnel info.
   * Returns when the host is up and running.
   * @returns key value pairs of port and the public URL for that port.
   */
  public async startTunnelHost(
    ports: number[],
    tunnelInfo?: TunnelInfo,
    logProvider?: LogProvider
  ): Promise<TunnelHostResult> {
    const tunnelInstance = await this.ensureTunnelExist(ports, tunnelInfo);
    await this.ensurePortsExist(tunnelInstance, ports);

    // TODO: Handle cases that host is already up. This happens when last host is not cleaned up (rare case).

    this.tunnelHost = new TunnelRelayTunnelHost(this.tunnelManagementClient);
    this.tunnelHost.trace = (level: TraceLevel, eventId: number, msg: string, err?: Error) => {
      logProvider?.log(
        MicrosoftTunnelingManager.convertToLogLevel(level),
        "MicrosoftTunnelingSDK: " + msg
      );
    };

    // Start host. This is an non-blocking operations. It does not block on the host service.
    await this.tunnelHost.start(tunnelInstance);

    const portEndpoints = await this.getPortEndpoints(tunnelInstance, ports);
    globalPortEndpoints = portEndpoints;
    return {
      portEndpoints: portEndpoints,
      tunnelInfo: {
        tunnelsClusterId: tunnelInstance.clusterId,
        tunnelsId: tunnelInstance.tunnelId,
      },
    };
  }

  public async stopTunnelHost(): Promise<void> {
    if (this.tunnelHost) {
      this.tunnelHost.dispose();
      this.tunnelHost = undefined;
      globalPortEndpoints = undefined;
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
      // TODO: handler all API call exceptions and convert to FxError
      const tunnelResult = await this.tunnelManagementClient.getTunnel(tunnel);
      if (tunnelResult && tunnelResult.endpoints) {
        for (const endpoint of tunnelResult.endpoints) {
          const portUriFormat = endpoint.portUriFormat;
          if (
            // Currently there is a bug that endpoint.connectionMode is wrong value.
            // https://github.com/microsoft/basis-planning/issues/351
            /*endpoint.connectionMode === TunnelConnectionMode.TunnelRelay && */
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
   * @param tunnelInfo If passed in, will re-use this tunnel.
   * @returns the tunnel created or retrieved.
   */
  private async ensureTunnelExist(ports: number[], tunnelInfo?: TunnelInfo): Promise<Tunnel> {
    let tunnelInstance: Tunnel;
    if (tunnelInfo?.tunnelsClusterId && tunnelInfo?.tunnelsId) {
      const tunnelResult = await this.tunnelManagementClient.getTunnel({
        tunnelId: tunnelInfo.tunnelsId,
        clusterId: tunnelInfo.tunnelsClusterId,
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

  private static convertToLogLevel(traceLevel: TraceLevel): LogLevel {
    const mapping = {
      [TraceLevel.Error]: LogLevel.Error,
      [TraceLevel.Warning]: LogLevel.Warning,
      [TraceLevel.Info]: LogLevel.Info,
      [TraceLevel.Verbose]: LogLevel.Debug,
    };
    return mapping[traceLevel] || LogLevel.Info;
  }
}

function sleep(millis: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), millis);
  });
}

// Tunnels are managed in vscode/cli task and tunnel endpoints are read in solution.
// So use a global variable to share between task and solution.
let globalPortEndpoints: Map<number, string> | undefined;
export function getCurrentTunnelPorts(): Map<number, string> | undefined {
  return globalPortEndpoints;
}
