/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.
 * -------------------------------------------------------------------------------------------
 */
import * as vscode from "vscode";
import CDP from "chrome-remote-interface";

export const isConnectionActive = async (client: CDP.Client): Promise<boolean> => {
  try {
    await client.send('Browser.getVersion');
    return true;
  } catch (error) {
    return false;
  }
}


export const startConnectionCheck = (client: CDP.Client, interval = 3000): () => void => {
  const copilotDebuggerStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  const checkInterval: NodeJS.Timeout = (() => {
    const checkConnection = async (): Promise<void> => {
      try {
        const success = await updateConnectionStatus(client, copilotDebuggerStatusBarItem);
        if (!success) clearInterval(checkInterval);
      } catch (error) {
        console.error("Error checking connection status:", error);
        clearInterval(checkInterval);
        setDisconnectedStatus(copilotDebuggerStatusBarItem);
      }
    };

    return setInterval(() => checkConnection, interval);
  })();

  return () => {
    clearInterval(checkInterval);
    setDisconnectedStatus(copilotDebuggerStatusBarItem);
  };
};

const updateConnectionStatus = async (client: CDP.Client, copilotDebuggerStatusBarItem: vscode.StatusBarItem): Promise<boolean> => {
  const isActive = await isConnectionActive(client);
  if (!isActive) {
    setDisconnectedStatus(copilotDebuggerStatusBarItem);
    return false;
  } else {
    const { targetInfos } = await client.send('Target.getTargets');
    const activeTab = targetInfos.find(target => target.type === 'page' && target.attached);
    const url = activeTab ? activeTab.url : 'Unknown URL';
    setConnectedStatus(copilotDebuggerStatusBarItem, url);
    return true;
  }
}

export const setConnectedStatus = (copilotDebuggerStatusBarItem: vscode.StatusBarItem, url: string): void => {
  copilotDebuggerStatusBarItem.text = `$(browser) Copilot Debugger connected`;
  copilotDebuggerStatusBarItem.tooltip = `The Microsoft Copilot Debugger extension is currently connected to: ${url}`;
  copilotDebuggerStatusBarItem.show();
}

export const setDisconnectedStatus = (copilotDebuggerStatusBarItem: vscode.StatusBarItem): void => {
  copilotDebuggerStatusBarItem.text = `$(debug-disconnect) Copilot Debugger disconnected`;
  copilotDebuggerStatusBarItem.tooltip = 'The Microsoft Copilot Debugger extension is currently disconnected from all browser sessions.';
  copilotDebuggerStatusBarItem.show();
}