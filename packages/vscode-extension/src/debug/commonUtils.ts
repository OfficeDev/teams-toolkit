// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as dotenv from "dotenv";
import * as vscode from "vscode";
import * as constants from "./constants";
import { ConfigFolderName, Func } from "fx-api";
import { core, showError } from "../handlers";
import { execPowerShell, execShell} from "./process";
import * as os from "os";

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

export async function getLocalDebugTeamsAppId(isLocalSideloadingConfiguration: boolean): Promise<string|undefined> {
  const func: Func = {
    namespace: "fx-solution-azure/fx-resource-local-debug",
    method: "getLaunchInput",
    params: isLocalSideloadingConfiguration ? "local" : "remote"
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
    method: "getProgrammingLanguage"
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

async function getPortListeningPidWindows(host: string, port: number): Promise<string | undefined> {
  try {
    let command = `(Get-NetTCPConnection -LocalPort ${port} -State Listen).OwningProcess`;
    if (host === "127.0.0.1") {
      // the process listening on 0.0.0.0 (IPv4) and ::1 (IPv6) will not block that on 127.0.0.1
      command = `(Get-NetTCPConnection -LocalAddress ${host} -LocalPort ${port} -State Listen).OwningProcess`;
    }
    const result = (await execPowerShell(command)).trim();
    return result.length === 0 ? undefined : result;
  } catch (err) {
    // ignore any error to not block debugging
    return undefined;
  }
}

async function getPortListeningPidLinux(host: string, port: number): Promise<string | undefined> {
  try {
    let command = `lsof -nP -t -i TCP:${port} -s TCP:LISTEN`;
    if (host == "127.0.0.1") {
      // the process listening on 0.0.0.0 (IPv4) and ::1 (IPv6) will not block that on 127.0.0.1
      command = `lsof -nP -t -i TCP@${host}:${port} -s TCP:LISTEN`;
    }
    let result = (await execShell(command)).trim();
    return result.length === 0 ? undefined : result;
  } catch (err) {
    // ignore any error to not block debugging
    return undefined;
  }
}

async function getPortListeningPidOSX(host: string, port: number): Promise<string | undefined> {
  return getPortListeningPidLinux(host, port);
}

export async function getPortListening(host: string, port: number): Promise<string | undefined> {
  const osType = os.type();
  if (osType === "Windows_NT") {
    return getPortListeningPidWindows(host, port);
  } else if (osType === "Darwin") {
    return getPortListeningPidOSX(host, port);
  } else {
    return getPortListeningPidLinux(host, port);
  }
}
