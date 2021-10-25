// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as dotenv from "dotenv";
import * as vscode from "vscode";
import * as constants from "./constants";
import { ConfigFolderName, Func, InputConfigsFolderName } from "@microsoft/teamsfx-api";
import VsCodeLogInstance from "../commonlib/log";
import { core, getSystemInputs, showError } from "../handlers";
import * as net from "net";
import { ext } from "../extensionVariables";
import { isMultiEnvEnabled, isValidProject, isMigrateFromV1Project } from "@microsoft/teamsfx-core";

export async function getProjectRoot(
  folderPath: string,
  folderName: string
): Promise<string | undefined> {
  const projectRoot: string = path.join(folderPath, folderName);
  const projectExists: boolean = await fs.pathExists(projectRoot);
  return projectExists ? projectRoot : undefined;
}

export async function getLocalEnv(): Promise<{ [key: string]: string } | undefined> {
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
  return env;
}

function getLocalEnvWithPrefix(
  env: { [key: string]: string } | undefined,
  prefix: string
): { [key: string]: string } | undefined {
  if (env === undefined) {
    return undefined;
  }
  const result: { [key: string]: string } = {};
  for (const key of Object.keys(env)) {
    if (key.startsWith(prefix) && env[key]) {
      result[key.slice(prefix.length)] = env[key];
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function getFrontendLocalEnv(
  env: { [key: string]: string } | undefined
): { [key: string]: string } | undefined {
  return getLocalEnvWithPrefix(env, constants.frontendLocalEnvPrefix);
}

export function getBackendLocalEnv(
  env: { [key: string]: string } | undefined
): { [key: string]: string } | undefined {
  return getLocalEnvWithPrefix(env, constants.backendLocalEnvPrefix);
}

export function getAuthLocalEnv(
  env: { [key: string]: string } | undefined
): { [key: string]: string } | undefined {
  // SERVICE_PATH will also be included, but it has no side effect
  return getLocalEnvWithPrefix(env, constants.authLocalEnvPrefix);
}

export function getAuthServicePath(env: { [key: string]: string } | undefined): string | undefined {
  return env ? env[constants.authServicePathEnvKey] : undefined;
}

export function getBotLocalEnv(
  env: { [key: string]: string } | undefined
): { [key: string]: string } | undefined {
  return getLocalEnvWithPrefix(env, constants.botLocalEnvPrefix);
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

export async function hasTeamsfxBot(): Promise<boolean> {
  if (!vscode.workspace.workspaceFolders) {
    return false;
  }

  const workspaceFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
  const workspacePath: string = workspaceFolder.uri.fsPath;
  if (!(await isFxProject(workspacePath))) {
    return false;
  }

  const botRoot = await getProjectRoot(workspacePath, constants.botFolderName);

  return botRoot !== undefined;
}

export async function getLocalDebugEnvs(): Promise<Record<string, string>> {
  const localDebugEnvs = await executeLocalDebugUserTask("getLocalDebugEnvs");
  return localDebugEnvs as Record<string, string>;
}

export async function getDebugConfig(
  isLocalSideloadingConfiguration: boolean
): Promise<{ appId: string; env?: string } | undefined> {
  const params = isLocalSideloadingConfiguration ? "local" : "remote";
  return await executeLocalDebugUserTask("getLaunchInput", params);
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
      ports.push(...constants.backendServicePorts);
      const backendDevScript = await loadTeamsFxDevScript(backendRoot);
      if (
        backendDevScript === undefined ||
        constants.backendDebugPortRegex.test(backendDevScript)
      ) {
        ports.push(...constants.backendDebugPorts);
      }
    }
    const botRoot = await getProjectRoot(workspacePath, constants.botFolderName);
    if (botRoot) {
      ports.push(...constants.botServicePorts);
      const botDevScript = await loadTeamsFxDevScript(botRoot);
      if (botDevScript === undefined || constants.botDebugPortRegex.test(botDevScript)) {
        ports.push(...constants.botDebugPorts);
      }
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

// This function is not used with multi-env.
// In the multi-env case, it will use getLocalSettings().
function getSettingWithUserData(jsonSelector: (jsonObject: any) => any): string | undefined {
  // get final setting value from env.xxx.json and xxx.userdata
  // Note: this is a workaround and need to be updated after multi-env
  if (ext.workspaceUri) {
    const ws = ext.workspaceUri.fsPath;
    if (isValidProject(ws)) {
      const envJsonPath = path.join(ws, `.${ConfigFolderName}/env.default.json`);
      const envJson = JSON.parse(fs.readFileSync(envJsonPath, "utf8"));
      const settingValue = jsonSelector(envJson) as string;
      if (settingValue && settingValue.startsWith("{{") && settingValue.endsWith("}}")) {
        // setting in env.xxx.json is place holder and need to get actual value from xxx.userdata
        const placeHolder = settingValue.replace("{{", "").replace("}}", "");
        const userdataPath = path.join(ws, `.${ConfigFolderName}/default.userdata`);
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
      return getLocalSetting((localSettingsJson) => localSettingsJson.teamsApp?.tenantId);
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
      return getLocalSetting((localSettingsJson) => localSettingsJson.teamsApp?.teamsAppId);
    } else {
      return getSettingWithUserData((envJson) => envJson.solution.localDebugTeamsAppId);
    }
  } catch {
    // in case structure changes
    return undefined;
  }
}

export async function loadPackageJson(path: string): Promise<any> {
  if (!(await fs.pathExists(path))) {
    VsCodeLogInstance.error(`Cannot load package.json from ${path}. File not found.`);
    return undefined;
  }

  return new Promise((resolve) => {
    const readJson = require("read-package-json");
    readJson(path, (er: any, data: any) => {
      if (er) {
        VsCodeLogInstance.error(`Cannot load package.json from ${path}. Error: ${er}`);
        resolve(undefined);
      }

      resolve(data);
    });
  });
}

export async function loadTeamsFxDevScript(componentRoot: string): Promise<string | undefined> {
  const packageJson = await loadPackageJson(path.join(componentRoot, "package.json"));
  if (packageJson && packageJson.scripts && packageJson.scripts["dev:teamsfx"]) {
    const devTeamsfx: string = packageJson.scripts["dev:teamsfx"];
    constants.npmRunDevRegex.test(devTeamsfx) ? packageJson.scripts["dev"] : devTeamsfx;
  } else {
    return undefined;
  }
}
