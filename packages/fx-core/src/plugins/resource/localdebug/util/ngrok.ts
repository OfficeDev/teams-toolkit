// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";

interface NgrokHttpConfig {
    addr: string
}

interface NgrokTunnel {
    public_url: string;
    proto: string,
    config: NgrokHttpConfig
}

interface NgrokApiTunnelsResponse {
    tunnels: NgrokTunnel[];
}

function delay(ms: number) {
    // tslint:disable-next-line no-string-based-set-timeout
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getNgrokHttpUrl(port: string | number): Promise<string | undefined> {
    let numRetries = 10;
    while (numRetries > 0) {
        try {
            const resp = await axios.get("http://localhost:4040/api/tunnels");
            if (resp && resp.data) {
                const tunnels = (<NgrokApiTunnelsResponse>resp.data).tunnels;
                // tunnels will be empty if tunnel connection is not completed
                for (const tunnel of tunnels) {
                    if (tunnel.config.addr === `http://localhost:${port}` && tunnel.proto === "https") {
                        return tunnel.public_url;
                    }
                }
            }
        } catch (err) {
            // ECONNREFUSED if ngrok is not started
        }
        await delay(5000);
        --numRetries;
    }
    return undefined;
}