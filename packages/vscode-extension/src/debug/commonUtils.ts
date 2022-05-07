// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";
import * as vscode from "vscode";
import * as constants from "./constants";
import { ConfigFolderName, InputConfigsFolderName, UserError } from "@microsoft/teamsfx-api";
import VsCodeLogInstance from "../commonlib/log";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { getTeamsAppTelemetryInfoByEnv } from "../utils/commonUtils";
import { core, getSystemInputs, showError } from "../handlers";
import { ext } from "../extensionVariables";
import {
  LocalEnvManager,
  FolderName,
  isV3,
  isConfigUnifyEnabled,
  environmentManager,
  ProjectSettingsHelper,
  PluginNames,
  GLOBAL_CONFIG,
  getResourceGroupInPortal,
} from "@microsoft/teamsfx-core";
import { allRunningDebugSessions } from "./teamsfxTaskHandler";

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

  const backendRoot = await getProjectRoot(workspacePath, FolderName.Function);

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

  const botRoot = await getProjectRoot(workspacePath, FolderName.Bot);

  return botRoot !== undefined;
}

export async function getDebugConfig(
  isLocalSideloadingConfiguration: boolean,
  env?: string
): Promise<{ appId: string; env?: string } | undefined> {
  try {
    if (isV3()) {
      const inputs = getSystemInputs();
      const getConfigRes = await core.getProjectConfigV3(inputs);
      if (getConfigRes.isErr()) throw getConfigRes.error;
      const config = getConfigRes.value;
      if (!config)
        throw new UserError("extension", "GetConfigError", "Failed to get project config");
      if (isLocalSideloadingConfiguration) {
        const envInfo = config.envInfos["local"];
        if (!envInfo)
          throw new UserError("extension", "EnvConfigNotExist", "Local Env config not exist");
        const appId = envInfo.state["fx-resource-appstudio"].teamsAppId as string;
        return { appId: appId, env: "local" };
      } else {
        if (env === undefined) {
          const inputs = getSystemInputs();
          inputs.ignoreConfigPersist = true;
          inputs.ignoreEnvInfo = false;
          const envRes = await core.getSelectedEnv(inputs);
          if (envRes.isErr()) {
            VsCodeLogInstance.warning(`No environment selected. ${envRes.error}`);
            return undefined;
          }
          env = envRes.value;
        }
        if (!env)
          throw new UserError(
            "extension",
            "GetSelectedEnvError",
            "Failed to get selected Env name"
          );
        const envInfo = config.envInfos[env];
        if (!envInfo)
          throw new UserError("extension", "EnvConfigNotExist", `Env '${env} ' config not exist`);
        const appId = envInfo.state["fx-resource-appstudio"].teamsAppId as string;
        return { appId: appId, env: env };
      }
    } else {
      if (isLocalSideloadingConfiguration) {
        if (isConfigUnifyEnabled()) {
          // load local env app info
          const appInfo = getTeamsAppTelemetryInfoByEnv(environmentManager.getLocalEnvName());
          return { appId: appInfo?.appId as string, env: env };
        } else {
          const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
          const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
          return { appId: localSettings?.teamsApp?.teamsAppId as string };
        }
      } else {
        // select env
        if (env === undefined) {
          const inputs = getSystemInputs();
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
        const appInfo = getTeamsAppTelemetryInfoByEnv(env!);
        if (appInfo === undefined) {
          throw new UserError({
            name: "MissingTeamsAppId",
            message: `No teams app found in ${env} environment. Run Provision to ensure teams app is created.`,
            source: "preview",
          });
        }

        return { appId: appInfo.appId as string, env: env };
      }
    }
  } catch (error: any) {
    showError(error);
    return undefined;
  }
}

export async function getNpmInstallLogInfo(): Promise<any> {
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
  return await localEnvManager.getNpmInstallLogInfo();
}

export async function getPortsInUse(): Promise<number[]> {
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
  try {
    const projectPath = ext.workspaceUri.fsPath;
    const projectSettings = await localEnvManager.getProjectSettings(projectPath);
    return await localEnvManager.getPortsInUse(projectPath, projectSettings);
  } catch (error: any) {
    VsCodeLogInstance.warning(`Failed to check used ports. Error: ${error}`);
    return [];
  }
}

export async function getTeamsAppTenantId(): Promise<string | undefined> {
  try {
    const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
    if (isConfigUnifyEnabled()) {
      const projectSettings = await localEnvManager.getProjectSettings(ext.workspaceUri.fsPath);
      const localEnvInfo = await localEnvManager.getLocalEnvInfo(ext.workspaceUri.fsPath, {
        projectId: projectSettings.projectId,
      });
      if (localEnvInfo && localEnvInfo["state"] && localEnvInfo["state"][PluginNames.AAD]) {
        return localEnvInfo["state"][PluginNames.APPST].tenantId as string;
      }
      return undefined;
    } else {
      const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
      return localSettings?.teamsApp?.tenantId as string;
    }
  } catch {
    // in case structure changes
    return undefined;
  }
}

export async function getLocalTeamsAppId(): Promise<string | undefined> {
  try {
    const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
    if (isConfigUnifyEnabled()) {
      const projectSettings = await localEnvManager.getProjectSettings(ext.workspaceUri.fsPath);
      const localEnvInfo = await localEnvManager.getLocalEnvInfo(ext.workspaceUri.fsPath, {
        projectId: projectSettings.projectId,
      });
      if (localEnvInfo && localEnvInfo["state"] && localEnvInfo["state"][PluginNames.APPST]) {
        return localEnvInfo["state"][PluginNames.APPST].teamsAppId as string;
      }
      return undefined;
    } else {
      const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
      return localSettings?.teamsApp?.teamsAppId as string;
    }
  } catch {
    // in case structure changes
    return undefined;
  }
}

export async function getLocalBotId(): Promise<string | undefined> {
  try {
    if (isConfigUnifyEnabled()) {
      const result = environmentManager.getEnvStateFilesPath(
        environmentManager.getLocalEnvName(),
        ext.workspaceUri.fsPath
      );
      const envJson = JSON.parse(fs.readFileSync(result.envState, "utf8"));
      return envJson[PluginNames.BOT].botId;
    } else {
      const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
      const localSettings = await localEnvManager.getLocalSettings(ext.workspaceUri.fsPath);
      return localSettings?.bot?.botId as string;
    }
  } catch {
    return undefined;
  }
}

export async function getBotId(env: string): Promise<string | undefined> {
  try {
    if (env === environmentManager.getLocalEnvName()) {
      return await getLocalBotId();
    }

    const result = environmentManager.getEnvStateFilesPath(env, ext.workspaceUri.fsPath);
    const envJson = JSON.parse(fs.readFileSync(result.envState, "utf8"));
    return envJson[PluginNames.BOT].botId;
  } catch {
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

// Helper functions for local debug correlation-id, only used for telemetry
// Use a 2-element tuple to handle concurrent F5
const localDebugCorrelationIds: [string, string] = ["no-session-id", "no-session-id"];
let current = 0;
export function startLocalDebugSession(): string {
  current = (current + 1) % 2;
  localDebugCorrelationIds[current] = uuid.v4();
  return getLocalDebugSessionId();
}

export function endLocalDebugSession() {
  localDebugCorrelationIds[current] = "no-session-id";
  current = (current + 1) % 2;
}

export function getLocalDebugSessionId(): string {
  return localDebugCorrelationIds[current];
}

export function checkAndSkipDebugging(): boolean {
  // skip debugging if there is already a debug session
  if (allRunningDebugSessions.size > 0) {
    VsCodeLogInstance.warning("SKip debugging because there is already a debug session.");
    endLocalDebugSession();
    return true;
  }
  return false;
}

// for telemetry use only
export async function getProjectComponents(): Promise<string | undefined> {
  const localEnvManager = new LocalEnvManager(VsCodeLogInstance, ExtTelemetry.reporter);
  try {
    const projectPath = ext.workspaceUri.fsPath;
    const projectSettings = await localEnvManager.getProjectSettings(projectPath);
    const components: string[] = [];
    if (ProjectSettingsHelper.isSpfx(projectSettings)) {
      components.push("spfx");
    }
    if (ProjectSettingsHelper.includeFrontend(projectSettings)) {
      components.push("frontend");
    }
    if (ProjectSettingsHelper.includeBot(projectSettings)) {
      components.push("bot");
    }
    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      components.push("backend");
    }
    return components.join("+");
  } catch (error: any) {
    return undefined;
  }
}
