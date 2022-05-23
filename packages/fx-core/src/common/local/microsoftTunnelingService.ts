// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, FxError, LogProvider, LogLevel, Result, err } from "@microsoft/teamsfx-api";
import { TunnelRelayTunnelHost } from "@vs/tunnels-connections";
import { Tunnel, TunnelAccessScopes } from "@vs/tunnels-contracts";
import { TunnelManagementHttpClient, TunnelRequestOptions } from "@vs/tunnels-management";
import { TraceLevel } from "@vs/vs-ssh";
import {
  MicrosoftTunnelingError,
  MicrosoftTunnelingLoginError,
  runWithMicrosoftTunnelingServiceErrorHandling,
} from "./microsoftTunnelingError";
// Need to use require instead of import to prevent packaging folder structure issue.
const corePackage = require("../../../package.json");

const TeamsfxPermissionCheckTunnelName = "teamsfxpermissioncheck";
const TeamsfxTunnelingUserAgent = { name: corePackage.name, version: corePackage.version };

export class MicrosoftTunnelingService {
  private tunnelManagementClient: TunnelManagementHttpClient;
  private tunnelHost?: TunnelRelayTunnelHost;
  private logProvider?: LogProvider;

  constructor(
    getTunnelingAccessToken: () => Promise<Result<string, FxError>>,
    logProvider?: LogProvider
  ) {
    this.tunnelManagementClient = new TunnelManagementHttpClient(
      TeamsfxTunnelingUserAgent,
      async (): Promise<string> => {
        const result = await getTunnelingAccessToken();
        if (result.isErr()) {
          // Microsoft tunneling SDK use exception in their callbacks to handle errors.
          // The exception is thrown when actually calling an API (e.g. createTunnel()).
          // This exception is handled in runWithMicrosoftTunnelingServiceErrorHandling().
          throw new MicrosoftTunnelingLoginError(result.error);
        }
        const accessToken = result.value;
        return `Bearer ${accessToken}`;
      }
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

  async hostStart(tunnel: Tunnel): Promise<Result<void, FxError>> {
    if (
      !tunnel.accessTokens?.[TunnelAccessScopes.Host] ||
      !tunnel.accessTokens?.[TunnelAccessScopes.Connect]
    ) {
      return err(new MicrosoftTunnelingError("Cannot start host without host and connect tokens."));
    }
    if (!tunnel.ports || tunnel.ports.length === 0) {
      return err(new MicrosoftTunnelingError("Cannot start host without ports."));
    }

    return await runWithMicrosoftTunnelingServiceErrorHandling(async () => {
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

  async tryCreatingPermissionCheckTunnel(): Promise<Result<void, FxError>> {
    const result = await this.createTunnel({ name: TeamsfxPermissionCheckTunnelName });
    if (result.isErr()) {
      return err(result.error);
    }

    // Do not await. Only try to delete tunnel in the background
    try {
      this.tunnelManagementClient.deleteTunnel(result.value).catch(() => {
        /* Prevent unhandled promise rejection */
      });
    } catch {}

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
