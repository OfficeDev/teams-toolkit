/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.
 * -------------------------------------------------------------------------------------------
 */

import * as vscode from 'vscode';

export const getEdgeLocation = async () => {
  try {
    const edgePaths = await import('edge-paths');
    return edgePaths.getAnyEdgeStable();
  } catch (error) {
    void vscode.window.showErrorMessage(`Error locating edge browser, ${(error as Error).message}`);
    throw error;
  }
};