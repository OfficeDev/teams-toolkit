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
import { Protocol } from "devtools-protocol";
import logger from "../commonlib/log";

export const CDPModule = {
  build: CDP.default,
};

class CDPClient {
  url = "";
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
    if (this.url.includes("m365.cloud.microsoft/chat")) {
      // only m365.cloud.microsoft need listen to sub target iframe
      void this.launchTeamsChatListener(client);
    } else {
      // Enable the necessary domains
      await client.Network.enable();
      await client.Page.enable();
      client.Network.webSocketFrameReceived(webSocketFrameReceivedHandler);
    }
  }

  async launchTeamsChatListener(client: CDP.Client, retries = 10): Promise<void> {
    for (let i = 0; i < retries; ++i) {
      try {
        const res = await this.connectToTargetIframe(client);
        if (res) {
          break;
        }
      } catch (error) {
        this.cdpErrors.push(error);
      }
      if (i + 1 === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  isCopilotChatUrl(url: string): boolean {
    const low = url.toLowerCase();
    return low.includes("office.com/chat") || low.includes("m365.cloud.microsoft/chat");
  }

  async connectToTargetIframe(client: CDP.Client): Promise<boolean> {
    const targets = await client.Target.getTargets();
    const iframeTargets = targets.targetInfos.filter(
      ({ type, url }) =>
        type === "iframe" && url.includes("outlook.office.com/hosted/semanticoverview/Users")
    );
    for (const iframeTarget of iframeTargets) {
      const sessionClient = await this.connectWithBackoff(
        DefaultRemoteDebuggingPort,
        iframeTarget.targetId
      );
      if (sessionClient) {
        await sessionClient.Network.enable();
        await sessionClient.Page.enable();
        sessionClient.Network.webSocketFrameReceived(webSocketFrameReceivedHandler);
        logger.info(
          `Connecting to iframe target to receive copilot debug info: ${iframeTarget.url}`
        );
        return true;
      }
    }
    return false;
  }

  async start(url: string) {
    if (!featureFlagManager.getBooleanValue(FeatureFlags.ApiPluginDebug)) return;
    if (this.cdpClients.length > 0) {
      // already started
      return;
    }
    this.url = url;
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
export function webSocketFrameReceivedHandler(event: Protocol.Network.WebSocketFrameReceivedEvent) {
  WebSocketEventHandler.handleEvent(event.response);
}
export const cdpClient = new CDPClient();
