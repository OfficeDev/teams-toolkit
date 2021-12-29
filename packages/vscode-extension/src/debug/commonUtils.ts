// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";
import * as dotenv from "dotenv";
import * as vscode from "vscode";
import * as constants from "./constants";
import { ConfigFolderName, InputConfigsFolderName, UserError } from "@microsoft/teamsfx-api";
import VsCodeLogInstance from "../commonlib/log";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { getTeamsAppIdByEnv } from "../utils/commonUtils";
import { core, getSystemInputs, showError } from "../handlers";
import * as net from "net";
import { ext } from "../extensionVariables";
import { isValidProject, isMigrateFromV1Project, LocalEnvManager } from "@microsoft/teamsfx-core";

export async function getProjectRoot(
  folderPath: string,
  folderName: string
): Promise<string | undefined> {
  const projectRoot: string = path.join(folderPath, folderName);
  const projectExists: boolean = await fs.pathExists(projectRoot);
  return projectExists ? projectRoot : undefined;
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

export async function getDebugConfig(
  isLocalSideloadingConfiguration: boolean,
  env?: string
): Promise<{ appId: string; env?: string } | undefined> {
  try {
    if (isLocalSideloadingConfiguration) {
      const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
      const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
      return { appId: localSettings?.teamsApp?.teamsAppId as string };
    } else {
      // select env
      if (env === undefined) {
        const inputs = getSystemInputs();
        inputs.ignoreLock = true;
        inputs.ignoreConfigPersist = true;
        inputs.ignoreEnvInfo = false;
        const envRes = await core.getSelectedEnv(inputs);
        if (envRes.isErr()) {
          VsCodeLogInstance.warning(`No environment selected. ${envRes.error}`);
          return undefined;
        }

        env = envRes.value;
      }

      // load env state
      const remoteId = getTeamsAppIdByEnv(env!);
      if (remoteId === undefined) {
        throw new UserError({
          name: "MissingTeamsAppId",
          message: `No teams app found in ${env} environment. Run Provision to ensure teams app is created.`,
          source: "preview",
        });
      }

      return { appId: remoteId as string, env: env };
    }
  } catch (error: any) {
    showError(error);
    return undefined;
  }
}

export async function getSkipNgrokConfig(): Promise<boolean> {
  try {
    const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
    const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
    return (localSettings?.bot?.skipNgrok as boolean) === true;
  } catch (error: any) {
    showError(error);
    return false;
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
      const migrateFromV1 = await isMigrateFromV1Project(workspacePath);
      if (!migrateFromV1) {
        ports.push(...constants.simpleAuthPorts);
      }
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

export async function getTeamsAppTenantId(): Promise<string | undefined> {
  try {
    const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
    const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
    return localSettings?.teamsApp?.tenantId as string;
  } catch {
    // in case structure changes
    return undefined;
  }
}

export async function getLocalTeamsAppId(): Promise<string | undefined> {
  try {
    const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
    const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
    return localSettings?.teamsApp?.teamsAppId as string;
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

  const rpj = require("read-package-json-fast");
  try {
    return await rpj(path);
  } catch (error) {
    VsCodeLogInstance.error(`Cannot load package.json from ${path}. Error: ${error}`);
    return undefined;
  }
}

export async function loadTeamsFxDevScript(componentRoot: string): Promise<string | undefined> {
  const packageJson = await loadPackageJson(path.join(componentRoot, "package.json"));
  if (packageJson && packageJson.scripts && packageJson.scripts["dev:teamsfx"]) {
    const devTeamsfx: string = packageJson.scripts["dev:teamsfx"];
    return constants.npmRunDevRegex.test(devTeamsfx) ? packageJson.scripts["dev"] : devTeamsfx;
  } else {
    return undefined;
  }
}

// Helper functions for local debug correlation-id, only used for telemetry
let localDebugCorrelationId: string | undefined = undefined;
export function startLocalDebugSession(): string {
  localDebugCorrelationId = uuid.v4();
  return getLocalDebugSessionId();
}

export function endLocalDebugSession() {
  localDebugCorrelationId = undefined;
}

export function getLocalDebugSessionId(): string {
  return localDebugCorrelationId || "no-session-id";
}
