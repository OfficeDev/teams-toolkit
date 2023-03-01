// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import axios from "axios";

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

export async function getNgrokHttpUrl(addr: string | number): Promise<string | undefined> {
  for (let ngrokWebInterfacePort = 4040; ngrokWebInterfacePort < 4045; ++ngrokWebInterfacePort) {
    let numRetries = 5;
    while (numRetries > 0) {
      try {
        const resp = await axios.get(`http://localhost:${ngrokWebInterfacePort}/api/tunnels`);
        if (resp && resp.data) {
          const tunnels = (<NgrokApiTunnelsResponse>resp.data).tunnels;
          // tunnels will be empty if tunnel connection is not completed
          for (const tunnel of tunnels) {
            if (typeof addr === "number" || Number.isInteger(Number.parseInt(addr))) {
              addr = `http://localhost:${addr}`;
            }

            if (
              removeTrailingSlash(tunnel.config.addr) === removeTrailingSlash(addr) &&
              tunnel.proto === "https"
            ) {
              return tunnel.public_url;
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
  return undefined;
}

// TODO: support http://127.0.0.1:4040/api/tunnels/bot
export async function getNgrokTunnelFromApi(
  webServiceUrl: string
): Promise<{ src: string; dest: string } | undefined> {
  try {
    const resp = await axios.get(webServiceUrl);
    if (resp && resp.data) {
      const tunnels = (<NgrokApiTunnelsResponse>resp.data).tunnels;
      // tunnels will be empty if tunnel connection is not completed
      for (const tunnel of tunnels) {
        if (tunnel.proto === "https") {
          return { src: tunnel.config.addr, dest: tunnel.public_url };
        }
      }
    }
  } catch (err) {
    // ECONNREFUSED if ngrok is not started
  }

  return undefined;
}

function removeTrailingSlash(str: string): string {
  return str.replace(/\/$/, "");
}
