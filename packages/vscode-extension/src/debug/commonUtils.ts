// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as dotenv from "dotenv";
import * as vscode from "vscode";
import * as constants from "./constants";
import { ConfigFolderName, Func } from "@microsoft/teamsfx-api";
import { core, showError } from "../handlers";
import * as net from "net";
import { ext } from "../extensionVariables";
import { getActiveEnv, isWorkspaceSupported } from "../utils/commonUtils";

export async function getProjectRoot(
  folderPath: string,
  folderName: string
): Promise<string | undefined> {
  const projectRoot: string = path.join(folderPath, folderName);
  const projectExists: boolean = await fs.pathExists(projectRoot);
  return projectExists ? projectRoot : undefined;
}

async function getLocalEnv(prefix = ""): Promise<{ [key: string]: string } | undefined> {
  if (!vscode.workspace.workspaceFolders) {
    return undefined;
  }

  const workspacePath: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const localEnvFilePath: string = path.join(
    workspacePath,
    `.${ConfigFolderName}`,
    constants.localEnvFileName
  );
  if (!(await fs.pathExists(localEnvFilePath))) {
    return undefined;
  }

  const contents = await fs.readFile(localEnvFilePath);
  const env: dotenv.DotenvParseOutput = dotenv.parse(contents);

  const result: { [key: string]: string } = {};
  for (const key of Object.keys(env)) {
    if (key.startsWith(prefix) && env[key]) {
      result[key.slice(prefix.length)] = env[key];
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export async function getFrontendLocalEnv(): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(constants.frontendLocalEnvPrefix);
}

export async function getBackendLocalEnv(): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(constants.backendLocalEnvPrefix);
}

export async function getAuthLocalEnv(): Promise<{ [key: string]: string } | undefined> {
  // SERVICE_PATH will also be included, but it has no side effect
  return getLocalEnv(constants.authLocalEnvPrefix);
}

export async function getAuthServicePath(): Promise<string | undefined> {
  const result = await getLocalEnv();
  return result ? result[constants.authServicePathEnvKey] : undefined;
}

export async function getBotLocalEnv(): Promise<{ [key: string]: string } | undefined> {
  return getLocalEnv(constants.botLocalEnvPrefix);
}

export async function isFxProject(folderPath: string): Promise<boolean> {
  return fs.pathExists(path.join(folderPath, `.${ConfigFolderName}`));
}

export async function hasTeamsfxBackend(): Promise<boolean> {
  if (!vscode.workspace.workspaceFolders) {
    return false;
  }

  const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
  const workspacePath: string = workspaceFolder.uri.fsPath;
  if (!(await isFxProject(workspacePath))) {
    return false;
  }

  const backendRoot = await getProjectRoot(workspacePath, constants.backendFolderName);

  return backendRoot !== undefined;
}

export async function getLocalDebugTeamsAppId(
  isLocalSideloadingConfiguration: boolean
): Promise<string | undefined> {
  const func: Func = {
    namespace: "fx-solution-azure/fx-resource-local-debug",
    method: "getLaunchInput",
    params: isLocalSideloadingConfiguration ? "local" : "remote",
  };
  try {
    const result = await core.callFunc(func);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value as string;
  } catch (err) {
    await showError(err);
  }
}

export async function getProgrammingLanguage(): Promise<string | undefined> {
  const func: Func = {
    namespace: "fx-solution-azure/fx-resource-local-debug",
    method: "getProgrammingLanguage",
  };
  try {
    const result = await core.callFunc(func);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value as string;
  } catch (err) {
    await showError(err);
  }
}

async function getLocalDebugConfig(key: string): Promise<string | undefined> {
  if (!vscode.workspace.workspaceFolders) {
    return undefined;
  }

  const workspacePath: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const userDataFilePath: string = path.join(
    workspacePath,
    `.${ConfigFolderName}`,
    constants.userDataFileName
  );
  if (!(await fs.pathExists(userDataFilePath))) {
    return undefined;
  }

  const contents = await fs.readFile(userDataFilePath);
  const configs: dotenv.DotenvParseOutput = dotenv.parse(contents);

  return configs[key];
}

export async function getSkipNgrokConfig(): Promise<string | undefined> {
  return getLocalDebugConfig(constants.skipNgrokConfigKey);
}

async function detectPortListeningImpl(port: number, host: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    try {
      const server = net.createServer();
      server
        .once("error", (err) => {
          if (err.message.includes("EADDRINUSE")) {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .once("listening", () => {
          server.close();
        })
        .once("close", () => {
          resolve(false);
        })
        .listen(port, host);
    } catch (err) {
      // ignore any error to not block debugging
      resolve(false);
    }
  });
}

export async function detectPortListening(port: number, hosts: string[]): Promise<boolean> {
  for (const host of hosts) {
    if (await detectPortListeningImpl(port, host)) {
      return true;
    }
  }
  return false;
}

export async function getPortsInUse(): Promise<number[]> {
  const ports: [number, string[]][] = [];
  if (vscode.workspace.workspaceFolders) {
    const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;
    const frontendRoot = await getProjectRoot(workspacePath, constants.frontendFolderName);
    if (frontendRoot) {
      ports.push(...constants.frontendPorts);
    }
    const backendRoot = await getProjectRoot(workspacePath, constants.backendFolderName);
    if (backendRoot) {
      ports.push(...constants.backendPorts);
    }
    const botRoot = await getProjectRoot(workspacePath, constants.botFolderName);
    if (botRoot) {
      ports.push(...constants.botPorts);
    }
  }

  const portsInUse: number[] = [];
  for (const port of ports) {
    if (await detectPortListening(port[0], port[1])) {
      portsInUse.push(port[0]);
    }
  }
  return portsInUse;
}

export function getTeamsAppTenantId(): string | undefined {
  if (ext.workspaceUri) {
    const ws = ext.workspaceUri.fsPath;
    if (isWorkspaceSupported(ws)) {
      const env = getActiveEnv();
      const envJsonPath = path.join(ws, `.${ConfigFolderName}/env.${env}.json`);
      const envJson = JSON.parse(fs.readFileSync(envJsonPath, "utf8"));
      return envJson.solution.teamsAppTenantId;
    }
  }

  return undefined;
}
