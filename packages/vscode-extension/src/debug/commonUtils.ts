// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as dotenv from "dotenv";
import * as vscode from "vscode";
import * as constants from "./constants";
import {
  ConfigFolderName,
  Func,
  InputConfigsFolderName,
  PublishProfilesFolderName,
} from "@microsoft/teamsfx-api";
import { core, getSystemInputs, showError } from "../handlers";
import * as net from "net";
import { ext } from "../extensionVariables";
import { initializeFocusRects } from "@fluentui/utilities";
import {
  isMultiEnvEnabled,
  isValidProject,
  isMigrateFromV1Project,
  getActiveEnv,
} from "@microsoft/teamsfx-core";

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

  let env: { [name: string]: string };
  if (isMultiEnvEnabled()) {
    // use localSettings.json as input to generate the local debug envs
    env = await getLocalDebugEnvs();
  } else {
    // use local.env file as input to generate the local debug envs
    if (!(await fs.pathExists(localEnvFilePath))) {
      return undefined;
    }

    const contents = await fs.readFile(localEnvFilePath);
    env = dotenv.parse(contents);
  }

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

export async function getLocalDebugEnvs(): Promise<Record<string, string>> {
  const localDebugEnvs = await executeLocalDebugUserTask("getLocalDebugEnvs");
  return localDebugEnvs as Record<string, string>;
}

export async function getLocalDebugTeamsAppId(
  isLocalSideloadingConfiguration: boolean
): Promise<string | undefined> {
  const params = isLocalSideloadingConfiguration ? "local" : "remote";
  const localDebugTeamsAppId = await executeLocalDebugUserTask("getLaunchInput", params);
  return localDebugTeamsAppId as string;
}

export async function getProgrammingLanguage(): Promise<string | undefined> {
  const programmingLanguage = await executeLocalDebugUserTask("getProgrammingLanguage");
  return programmingLanguage as string;
}

async function executeLocalDebugUserTask(funcName: string, params?: unknown): Promise<any> {
  const func: Func = {
    namespace: "fx-solution-azure/fx-resource-local-debug",
    method: funcName,
    params,
  };
  try {
    const inputs = getSystemInputs();
    inputs.ignoreLock = true;
    inputs.ignoreConfigPersist = true;
    if (isMultiEnvEnabled()) {
      const isRemote = params === "remote";
      inputs.ignoreEnvInfo = !isRemote;
    }
    const result = await core.executeUserTask(func, inputs);
    if (result.isErr()) {
      throw result.error;
    }
    return result.value;
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
    isMultiEnvEnabled()
      ? path.join(InputConfigsFolderName, constants.userDataFileNameNew)
      : constants.userDataFileName
  );
  if (!(await fs.pathExists(userDataFilePath))) {
    return undefined;
  }

  const contents = await fs.readFile(userDataFilePath);
  const configs: dotenv.DotenvParseOutput = dotenv.parse(contents);

  return configs[key];
}

export async function getSkipNgrokConfig(): Promise<boolean> {
  if (isMultiEnvEnabled()) {
    const skipNgrok = (await executeLocalDebugUserTask("getSkipNgrokConfig")) as boolean;
    return skipNgrok;
  } else {
    const skipNgrokConfig = await getLocalDebugConfig(constants.skipNgrokConfigKey);
    if (skipNgrokConfig === undefined || skipNgrokConfig.length === 0) {
      return false;
    } else {
      return skipNgrokConfig.trim().toLocaleLowerCase() === "true";
    }
  }
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
    const migrateFromV1 = await isMigrateFromV1Project(workspacePath);
    if (!migrateFromV1) {
      ports.push(...constants.simpleAuthPorts);
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

function getSettingWithUserData(jsonSelector: (jsonObject: any) => any): string | undefined {
  // get final setting value from env.xxx.json and xxx.userdata
  // Note: this is a workaround and need to be updated after multi-env
  if (ext.workspaceUri) {
    const ws = ext.workspaceUri.fsPath;
    if (isValidProject(ws)) {
      const env = getActiveEnv(ws);
      const envJsonPath = isMultiEnvEnabled()
        ? path.join(ws, `.${ConfigFolderName}/${PublishProfilesFolderName}/profile.${env}.json`)
        : path.join(ws, `.${ConfigFolderName}/env.${env}.json`);
      const envJson = JSON.parse(fs.readFileSync(envJsonPath, "utf8"));
      const settingValue = jsonSelector(envJson) as string;
      if (settingValue && settingValue.startsWith("{{") && settingValue.endsWith("}}")) {
        // setting in env.xxx.json is place holder and need to get actual value from xxx.userdata
        const placeHolder = settingValue.replace("{{", "").replace("}}", "");
        const userdataPath = isMultiEnvEnabled()
          ? path.join(ws, `.${ConfigFolderName}/publishProfiles/${env}.userdata`)
          : path.join(ws, `.${ConfigFolderName}/${env}.userdata`);
        if (fs.existsSync(userdataPath)) {
          const userdata = fs.readFileSync(userdataPath, "utf8");
          const userEnv = dotenv.parse(userdata);
          return userEnv[placeHolder];
        } else {
          // in collaboration scenario, userdata may not exist
          return undefined;
        }
      }

      return settingValue;
    }
  }

  return undefined;
}

// This is for the new folder structure for multi-env
function getLocalSetting(jsonSelector: (jsonObject: any) => any): string | undefined {
  if (ext.workspaceUri) {
    const ws = ext.workspaceUri.fsPath;
    if (isValidProject(ws)) {
      const localSettingsPath = path.join(
        ws,
        `.${ConfigFolderName}/${InputConfigsFolderName}/${constants.localSettingsJsonName}`
      );
      const envJson = JSON.parse(fs.readFileSync(localSettingsPath, "utf8"));
      const settingValue = jsonSelector(envJson) as string;
      return settingValue;
    }
  }

  return undefined;
}

export function getTeamsAppTenantId(): string | undefined {
  try {
    if (isMultiEnvEnabled()) {
      return getLocalSetting((localSettingsJson) => localSettingsJson.teamsApp.tenantId);
    } else {
      return getSettingWithUserData((envJson) => envJson.solution.teamsAppTenantId);
    }
  } catch {
    // in case structure changes
    return undefined;
  }
}

export function getLocalTeamsAppId(): string | undefined {
  try {
    if (isMultiEnvEnabled()) {
      return getLocalSetting((localSettingsJson) => localSettingsJson.teamsApp.teamsAppId);
    } else {
      return getSettingWithUserData((envJson) => envJson.solution.localDebugTeamsAppId);
    }
  } catch {
    // in case structure changes
    return undefined;
  }
}
