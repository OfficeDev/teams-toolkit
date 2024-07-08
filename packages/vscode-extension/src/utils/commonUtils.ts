// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec } from "child_process";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { format } from "util";
import { Result, SystemError, err, ok } from "@microsoft/teamsfx-api";
import { glob } from "glob";
import { core, workspaceUri } from "../globalVariables";
import { localize } from "./localizeUtils";
import { ExtensionSource, ExtensionErrors } from "../error/error";

export function isWindows() {
  return os.type() === "Windows_NT";
}

export function isMacOS() {
  return os.type() === "Darwin";
}

export function isLinux() {
  return os.type() === "Linux";
}

export function openFolderInExplorer(folderPath: string): void {
  const command = format('start "" "%s"', folderPath);
  exec(command);
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function acpInstalled(): boolean {
  const extension = vscode.extensions.getExtension("TeamsDevApp.vscode-adaptive-cards");
  return !!extension;
}

export async function hasAdaptiveCardInWorkspace(): Promise<boolean> {
  // Skip large files which are unlikely to be adaptive cards to prevent performance impact.
  const fileSizeLimit = 1024 * 1024;

  if (workspaceUri) {
    const files = await glob(workspaceUri.path + "/**/*.json", {
      ignore: ["**/node_modules/**", "./node_modules/**"],
    });
    for (const file of files) {
      let content = "";
      let fd = -1;
      try {
        fd = await fs.open(file, "r");
        const stat = await fs.fstat(fd);
        // limit file size to prevent performance impact
        if (stat.size > fileSizeLimit) {
          continue;
        }

        // avoid security issue
        const buffer = new Uint8Array(fileSizeLimit);
        const { bytesRead } = await fs.read(fd, buffer, 0, buffer.byteLength, 0);
        content = new TextDecoder().decode(buffer.slice(0, bytesRead));
      } catch (e) {
        // skip invalid files
        continue;
      } finally {
        if (fd >= 0) {
          fs.close(fd).catch(() => {});
        }
      }

      if (isAdaptiveCard(content)) {
        return true;
      }
    }
  }

  return false;
}

function isAdaptiveCard(content: string): boolean {
  const pattern = /"type"\s*:\s*"AdaptiveCard"/;
  return pattern.test(content);
}

export async function getLocalDebugMessageTemplate(isWindows: boolean): Promise<string> {
  const enabledTestTool = await isTestToolEnabled();

  if (isWindows) {
    return enabledTestTool
      ? localize("teamstoolkit.handlers.localDebugDescription.enabledTestTool")
      : localize("teamstoolkit.handlers.localDebugDescription");
  }

  return enabledTestTool
    ? localize("teamstoolkit.handlers.localDebugDescription.enabledTestTool.fallback")
    : localize("teamstoolkit.handlers.localDebugDescription.fallback");
}

// check if test tool is enabled in scaffolded project
async function isTestToolEnabled(): Promise<boolean> {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;

    const testToolYamlPath = path.join(workspacePath, "teamsapp.testtool.yml");
    return fs.pathExists(testToolYamlPath);
  }

  return false;
}

export function checkCoreNotEmpty(): Result<null, SystemError> {
  if (!core) {
    return err(
      new SystemError(
        ExtensionSource,
        ExtensionErrors.UnsupportedOperation,
        localize("teamstoolkit.handlers.coreNotReady")
      )
    );
  }
  return ok(null);
}
