/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.
 * -------------------------------------------------------------------------------------------
 */

import * as vscode from 'vscode';
import * as CDP from 'chrome-remote-interface';
import { WebSocketEventHandler } from './web-socket-event-handler';

export let DEFAULT_PORT = 9222;

export const connectWithBackoff = async (debugPort : number, target = '', retries = 5, delay = 2000): Promise<CDP.Client> => {
  await new Promise((resolve) => setTimeout(resolve, delay)); // initial delay

  for (let i = 0; i < retries; i++) {
    try {
      const client = await CDP.default({ port: debugPort, target });
      return client;
    } catch (error) {
      void vscode.window.showInformationMessage(
        `Attempt ${i + 1} failed. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // double the delay for the next attempt
    }
  }
  void vscode.window.showErrorMessage('All attempts to connect have failed');
  throw new Error("All attempts to connect have failed");
};

export const subscribeToWebSocketEvents = async (client: CDP.Client) : Promise<void> => {
    const { Network, Page } = client;

    // Enable the necessary domains
    await Network.enable();
    await Page.enable();
    launchTeamsChatListener(client);

    // listen to websocket messages and show them as information messages
    Network.webSocketFrameReceived(({ response }) => {
       WebSocketEventHandler.handleEvent(response);
    });

};

const launchTeamsChatListener = ({ Target }: CDP.Client) => {
    const teamsChatIntervalID = setInterval(() =>
    {
        void (async () =>
        {
            try
            {
                const targets = await Target.getTargets();

                // Teams chat is launched in an iframe, so we need to find the iframe target
                const copilotIframeTarget = targets.targetInfos.find(target => target.type === "iframe" && target.url.toLocaleLowerCase().includes("office"));
                if (copilotIframeTarget)
                {
                    const { targetId } = copilotIframeTarget;
                    const sessionClient: CDP.Client = await connectWithBackoff(DEFAULT_PORT, targetId);
                    if(sessionClient)
                    {
                        await sessionClient.Network.enable();
                        await sessionClient.Page.enable();
                        sessionClient.Network.webSocketFrameReceived(({ response }) => {
                            WebSocketEventHandler.handleEvent(response);
                        });
                        clearInterval(teamsChatIntervalID);
                    }
                }
            } catch (error)
            {
                console.error('Error in setInterval callback:', error);
            }
        })();
    }, 3000);
}