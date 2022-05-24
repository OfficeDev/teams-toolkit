// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { FxError, Result, err, ok, Inputs } from "@microsoft/teamsfx-api";
import axios from "axios";
import { getTunnelingService, TunnelingService } from "../../../../../common";
import { getCurrentTunnelPorts } from "../../../../../common/local/microsoftTunnelingManager";
import { MicrosoftTunnelingNotConnected, NgrokTunnelNotConnected } from "../error";

export async function getTunnelingHttpUrl(
  inputs: Inputs,
  port: number
): Promise<Result<string, FxError>> {
  // Assuming tunneling is enabled
  if (getTunnelingService(inputs) === TunnelingService.MicrosoftTunneling) {
    return await getMicrosoftTunnelingHttpUrl(port);
  } else {
    return await getNgrokHttpUrl(port);
  }
}

interface NgrokHttpConfig {
  addr: string;
}

interface NgrokTunnel {
  public_url: string;
  proto: string;
  config: NgrokHttpConfig;
}

interface NgrokApiTunnelsResponse {
  tunnels: NgrokTunnel[];
}

function delay(ms: number) {
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getMicrosoftTunnelingHttpUrl(port: number): Promise<Result<string, FxError>> {
  // endpointResult:
  //    FxError: some error occured when starting tunnel
  //    undefined: tunnel not connected yet (shouldn't happen because we tunneling task and setupLocalEnv are sequential)
  //    string: success
  const endpointsResult = getCurrentTunnelPorts();
  if (endpointsResult === undefined) {
    return err(new MicrosoftTunnelingNotConnected());
  }
  if (endpointsResult.isErr()) {
    return err(endpointsResult.error);
  }
  const endpoint: string | undefined = endpointsResult.value.get(port);
  if (endpoint === undefined) {
    return err(new MicrosoftTunnelingNotConnected());
  }
  // remove trailing '/' from Microsoft tunneling endpoint
  return ok(endpoint.replace(/\/$/, ""));
}

export async function getNgrokHttpUrl(port: string | number): Promise<Result<string, FxError>> {
  for (let ngrokWebInterfacePort = 4040; ngrokWebInterfacePort < 4045; ++ngrokWebInterfacePort) {
    let numRetries = 5;
    while (numRetries > 0) {
      try {
        const resp = await axios.get(`http://localhost:${ngrokWebInterfacePort}/api/tunnels`);
        if (resp && resp.data) {
          const tunnels = (<NgrokApiTunnelsResponse>resp.data).tunnels;
          // tunnels will be empty if tunnel connection is not completed
          for (const tunnel of tunnels) {
            if (tunnel.config.addr === `http://localhost:${port}` && tunnel.proto === "https") {
              return ok(tunnel.public_url);
            }
          }
        }
      } catch (err) {
        // ECONNREFUSED if ngrok is not started
      }
      await delay(2000);
      --numRetries;
    }
  }
  return err(NgrokTunnelNotConnected());
}
