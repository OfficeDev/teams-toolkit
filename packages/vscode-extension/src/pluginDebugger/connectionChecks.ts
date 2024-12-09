// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import CDP from "chrome-remote-interface";

export const isConnectionActive = async (client: CDP.Client): Promise<boolean> => {
  try {
    await client.send("Browser.getVersion");
    return true;
  } catch (error) {
    return false;
  }
};

export const startConnectionCheck = (client: CDP.Client, interval = 3000): (() => void) => {
  const checkInterval: NodeJS.Timeout = (() => {
    const checkConnection = async (): Promise<void> => {
      try {
        const success = await updateConnectionStatus(client);
        if (!success) clearInterval(checkInterval);
      } catch (error) {
        console.error("Error checking connection status:", error);
        clearInterval(checkInterval);
        logDisconnectedStatus();
      }
    };

    return setInterval(() => {
      void checkConnection(); // Ensures the promise is handled properly
    }, interval);
  })();

  return () => {
    clearInterval(checkInterval);
    logDisconnectedStatus();
  };
};

const updateConnectionStatus = async (client: CDP.Client): Promise<boolean> => {
  const isActive = await isConnectionActive(client);
  if (!isActive) {
    logDisconnectedStatus();
    return false;
  } else {
    logConnectedStatus();
    return true;
  }
};

export function logConnectedStatus(): void {
  vscode.debug.activeDebugConsole.appendLine(`Browser launched and connected to Devtools Protocol`);
}

export function logDisconnectedStatus(): void {
  vscode.debug.activeDebugConsole.appendLine(
    `The browser connection was lost. You can fix it by stopping this session and restarting the app`
  );
}
