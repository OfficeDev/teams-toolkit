// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Correlator, featureFlagManager, FeatureFlags, maskSecret } from "@microsoft/teamsfx-core";
import * as CDP from "chrome-remote-interface";
import * as uuid from "uuid";
import * as vscode from "vscode";
import {
  connectToExistingBrowserDebugSessionForCopilot,
  DefaultRemoteDebuggingPort,
} from "../debug/common/debugConstants";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { WebSocketEventHandler } from "./webSocketEventHandler";

export const CDPModule = {
  build: CDP.default,
};

class CDPClient {
  cdpClients: CDP.Client[] = [];
  cdpErrors: Error[] = [];
  cid: string | undefined;

  build(options: CDP.Options): Promise<CDP.Client> {
    return CDPModule.build(options);
  }
  async connectWithBackoff(
    debugPort: number,
    target = "",
    retries = 5,
    delay = 2000
  ): Promise<CDP.Client> {
    let recentError;
    for (let i = 0; i < retries; i++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, delay)); // initial delay
        const client = await this.build({ port: debugPort, target });
        this.cdpClients.push(client);
        return client;
      } catch (error) {
        this.cdpErrors.push(error);
        recentError = error;
        void vscode.window.showInformationMessage(
          `Attempt ${i + 1} failed. Retrying in ${delay}ms...`
        );
        delay *= 2; // double the delay for the next attempt
      }
    }
    void vscode.window.showErrorMessage("All attempts to connect have failed");
    throw recentError;
  }
  async subscribeToWebSocketEvents(client: CDP.Client): Promise<void> {
    const { Network, Page } = client;

    // Enable the necessary domains
    await Network.enable();
    await Page.enable();
    this.launchTeamsChatListener(client);
    // listen to websocket messages and show them as information messages
    Network.webSocketFrameReceived(({ response }) => {
      WebSocketEventHandler.handleEvent(response);
    });
  }
  launchTeamsChatListener({ Target }: CDP.Client) {
    const teamsChatIntervalID = setInterval(() => {
      void (async () => {
        try {
          const targets = await Target.getTargets();

          // Teams chat is launched in an iframe, so we need to find the iframe target
          const copilotIframeTarget = targets.targetInfos.find(
            (target) =>
              target.type === "iframe" && target.url.toLocaleLowerCase().includes("office")
          );
          if (copilotIframeTarget) {
            const { targetId } = copilotIframeTarget;
            const sessionClient: CDP.Client = await this.connectWithBackoff(
              DefaultRemoteDebuggingPort,
              targetId
            );
            if (sessionClient) {
              await sessionClient.Network.enable();
              await sessionClient.Page.enable();
              sessionClient.Network.webSocketFrameReceived(({ response }) => {
                WebSocketEventHandler.handleEvent(response);
              });
              clearInterval(teamsChatIntervalID);
            }
          }
        } catch (error) {
          // vscode.debug.activeDebugConsole.appendLine(
          //   `${RED} (×) Error: ${WHITE} Error in setInterval callback: ${(error as Error).message}`
          // );
          this.cdpErrors.push(error);
        }
      })();
    }, 3000);
  }

  async start() {
    if (!featureFlagManager.getBooleanValue(FeatureFlags.ApiPluginDebug)) return;
    if (this.cdpClients.length > 0) {
      // already started
      return;
    }
    this.cid = uuid.v4();
    await Correlator.runWithId(this.cid, async () => {
      ExtTelemetry.sendTelemetryEvent("cdp-client-start");
      try {
        const client: CDP.Client = await this.connectWithBackoff(DefaultRemoteDebuggingPort);
        await this.subscribeToWebSocketEvents(client);
        // stopCheck = startConnectionCheck(client, 30000);
        vscode.debug.activeDebugConsole.appendLine(
          connectToExistingBrowserDebugSessionForCopilot.successfulConnectionMessage(
            DefaultRemoteDebuggingPort
          )
        );
        ExtTelemetry.sendTelemetryEvent("cdp-client-start-success", {
          errors: maskSecret(
            this.cdpErrors.map((e) => JSON.stringify(e, Object.getOwnPropertyNames(e))).join(",")
          ),
        });
      } catch (error) {
        ExtTelemetry.sendTelemetryErrorEvent("cdp-client-start-fail", error, {
          errors: maskSecret(
            this.cdpErrors.map((e) => JSON.stringify(e, Object.getOwnPropertyNames(e))).join(",")
          ),
        });
      }
    });
  }
  async stop() {
    if (!featureFlagManager.getBooleanValue(FeatureFlags.ApiPluginDebug)) return;
    await Correlator.runWithId(this.cid || "", async () => {
      for (const client of this.cdpClients) {
        await client.close();
      }
      this.cdpClients = [];
      // stopCheck();
      ExtTelemetry.sendTelemetryEvent("cdp-client-end");
    });
  }
}

export const cdpClient = new CDPClient();
