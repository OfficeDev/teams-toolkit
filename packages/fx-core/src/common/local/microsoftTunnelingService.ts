// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, FxError, LogProvider, LogLevel, Result } from "@microsoft/teamsfx-api";
import { TunnelRelayTunnelHost } from "@vs/tunnels-connections";
import { Tunnel } from "@vs/tunnels-contracts";
import { TunnelManagementHttpClient, TunnelRequestOptions } from "@vs/tunnels-management";
import { TraceLevel } from "@vs/vs-ssh";
import { runWithMicrosoftTunnelingServiceErrorHandling } from "./microsoftTunnelingError";
// Need to use require instead of import to prevent packaging folder structure issue.
const corePackage = require("../../../package.json");

const TeamsfxTunnelingUserAgent = { name: corePackage.name, version: corePackage.version };

export class MicrosoftTunnelingService {
  private tunnelManagementClient: TunnelManagementHttpClient;
  private tunnelHost?: TunnelRelayTunnelHost;
  private logProvider?: LogProvider;

  constructor(getTunnelingAccessToken: () => Promise<string>, logProvider?: LogProvider) {
    this.tunnelManagementClient = new TunnelManagementHttpClient(
      TeamsfxTunnelingUserAgent,
      async () => `Bearer ${await getTunnelingAccessToken()}`
    );
    this.logProvider = logProvider;
  }

  async createTunnel(
    tunnelRequest: Tunnel,
    options?: TunnelRequestOptions
  ): Promise<Result<Tunnel, FxError>> {
    return await runWithMicrosoftTunnelingServiceErrorHandling(() =>
      this.tunnelManagementClient.createTunnel(tunnelRequest, options)
    );
  }

  async getTunnel(
    tunnel: Tunnel,
    options?: TunnelRequestOptions
  ): Promise<Result<Tunnel | null, FxError>> {
    return runWithMicrosoftTunnelingServiceErrorHandling(() =>
      this.tunnelManagementClient.getTunnel(tunnel, options)
    );
  }

  hostStart(tunnel: Tunnel): Promise<Result<void, FxError>> {
    return runWithMicrosoftTunnelingServiceErrorHandling(async () => {
      const tunnelHost = new TunnelRelayTunnelHost(this.tunnelManagementClient);
      tunnelHost.trace = (level: TraceLevel, eventId: number, msg: string, err?: Error) => {
        this.logProvider?.log(
          MicrosoftTunnelingService.convertToLogLevel(level),
          "MicrosoftTunnelingSDK: " + msg
        );
      };
      await tunnelHost.start(tunnel);
      this.tunnelHost = tunnelHost;
    });
  }

  async hostStop(): Promise<Result<void, FxError>> {
    this.tunnelHost?.dispose();
    return ok(undefined);
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
