// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec } from "child_process";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { format } from "util";
import * as vscode from "vscode";

import {
  ConfigFolderName,
  EnvNamePlaceholder,
  EnvStateFileNameTemplate,
  InputConfigsFolderName,
  Json,
  ProjectSettingsFileName,
  StatesFolderName,
  SubscriptionInfo,
} from "@microsoft/teamsfx-api";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { initializePreviewFeatureFlags } from "@microsoft/teamsfx-core/build/common/featureFlags";
import {
  isExistingTabApp as isExistingTabAppCore,
  isValidProject,
} from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import { PluginNames } from "@microsoft/teamsfx-core/build/component/constants";
import * as extensionPackage from "../../package.json";
import { CONFIGURATION_PREFIX, ConfigurationKey, YmlEnvNamePlaceholder } from "../constants";
import * as commonUtils from "../debug/commonUtils";
import * as globalVariables from "../globalVariables";
import { TelemetryProperty, TelemetryTriggerFrom } from "../telemetry/extTelemetryEvents";
import { isV3Enabled } from "@microsoft/teamsfx-core";
import * as yaml from "yaml";
import { getV3TeamsAppId } from "../debug/commonUtils";

export function getPackageVersion(versionStr: string): string {
  if (versionStr.includes("alpha")) {
    return "alpha";
  }

  if (versionStr.includes("beta")) {
    return "beta";
  }

  if (versionStr.includes("rc")) {
    return "rc";
  }

  return "formal";
}

export function isFeatureFlag(): boolean {
  return extensionPackage.featureFlag === "true";
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));

  await new Promise((resolve) => setTimeout(resolve, 0));
}

export function isWindows() {
  return os.type() === "Windows_NT";
}

export function isMacOS() {
  return os.type() === "Darwin";
}

export function isLinux() {
  return os.type() === "Linux";
}

export interface TeamsAppTelemetryInfo {
  appId: string;
  tenantId: string;
}

// Only used for telemetry when multi-env is enabled
export function getTeamsAppTelemetryInfoByEnv(env: string): TeamsAppTelemetryInfo | undefined {
  try {
    const ws = globalVariables.workspaceUri!.fsPath;

    if (isValidProject(ws)) {
      const result = environmentManager.getEnvStateFilesPath(env, ws);
      const envJson = JSON.parse(fs.readFileSync(result.envState, "utf8"));
      const appstudioState = envJson[PluginNames.APPST];
      return {
        appId: appstudioState.teamsAppId,
        tenantId: appstudioState.tenantId,
      };
    }
  } catch (e) {
    return undefined;
  }
}

export function getProjectId(): string | undefined {
  if (!globalVariables.workspaceUri) {
    return undefined;
  }
  try {
    const ws = globalVariables.workspaceUri.fsPath;
    const settingsJsonPathNew = path.join(
      ws,
      `.${ConfigFolderName}`,
      InputConfigsFolderName,
      ProjectSettingsFileName
    );
    const settingsJsonPathOld = path.join(ws, `.${ConfigFolderName}/settings.json`);

    // Do not check validity of project in multi-env.
    // Before migration, `isValidProject()` is false, but we still need to send `project-id` telemetry property.
    try {
      const settingsJson = JSON.parse(fs.readFileSync(settingsJsonPathNew, "utf8"));
      return settingsJson.projectId;
    } catch (e) {}

    // Also try reading from the old project location to support `ProjectMigratorMW` telemetry.
    // While doing migration, sending telemetry will call this `getProjectId()` function.
    // But before migration done, the settings file is still in the old location.
    const settingsJson = JSON.parse(fs.readFileSync(settingsJsonPathOld, "utf8"));
    return settingsJson.projectId;
  } catch (e) {
    return undefined;
  }
}

export function getAppName(): string | undefined {
  if (isV3Enabled()) {
    const yamlFilPath = path.join(globalVariables.workspaceUri!.fsPath, "teamsapp.yml");
    try {
      const settings = yaml.parse(fs.readFileSync(yamlFilPath, "utf-8"));
      for (const action of settings?.registerApp) {
        if (action?.uses === "teamsApp/create") {
          const name = action?.with?.name;
          if (name) {
            return name.replace(YmlEnvNamePlaceholder, "");
          }
        }
      }
      return undefined;
    } catch (e) {}
    return undefined;
  } else {
    const ws = globalVariables.workspaceUri!.fsPath;
    const settingsJsonPathNew = path.join(
      ws,
      `.${ConfigFolderName}`,
      InputConfigsFolderName,
      ProjectSettingsFileName
    );
    try {
      const settingsJson = JSON.parse(fs.readFileSync(settingsJsonPathNew, "utf8"));
      return settingsJson.appName;
    } catch (e) {}
    return undefined;
  }
}

export function openFolderInExplorer(folderPath: string): void {
  const command = format('start "" %s', folderPath);
  exec(command);
}

export async function isExistingTabApp(workspacePath: string): Promise<boolean> {
  // Check if solution settings is empty.
  const projectSettingsPath = path.resolve(
    workspacePath,
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    ProjectSettingsFileName
  );

  if (await fs.pathExists(projectSettingsPath)) {
    const projectSettings = await fs.readJson(projectSettingsPath);
    return isExistingTabAppCore(projectSettings);
  }

  return false;
}

export async function isM365Project(workspacePath: string): Promise<boolean> {
  const projectSettingsPath = path.resolve(
    workspacePath,
    `.${ConfigFolderName}`,
    InputConfigsFolderName,
    ProjectSettingsFileName
  );

  if (await fs.pathExists(projectSettingsPath)) {
    const projectSettings = await fs.readJson(projectSettingsPath);
    return projectSettings.isM365;
  } else {
    return false;
  }
}

export function anonymizeFilePaths(stack?: string): string {
  if (stack === undefined || stack === null) {
    return "";
  }

  const cleanupPatterns: RegExp[] = [];

  let updatedStack = stack;

  const cleanUpIndexes: [number, number][] = [];

  for (const regexp of cleanupPatterns) {
    while (true) {
      const result = regexp.exec(stack);

      if (!result) {
        break;
      }

      cleanUpIndexes.push([result.index, regexp.lastIndex]);
    }
  }

  const nodeModulesRegex = /^[\\\/]?(node_modules|node_modules\.asar)[\\\/]/;

  const fileRegex =
    /(file:\/\/)?([a-zA-Z]:(\\\\|\\|\/)|(\\\\|\\|\/))?([\w-\._]+(\\\\|\\|\/))+[\w-\._]*/g;

  let lastIndex = 0;

  updatedStack = "";

  while (true) {
    const result = fileRegex.exec(stack);

    if (!result) {
      break;
    }

    // Anoynimize user file paths that do not need to be retained or cleaned up.

    if (
      !nodeModulesRegex.test(result[0]) &&
      cleanUpIndexes.every(([x, y]) => result.index < x || result.index >= y)
    ) {
      updatedStack += stack.substring(lastIndex, result.index) + "<REDACTED: user-file-path>";

      lastIndex = fileRegex.lastIndex;
    }
  }

  if (lastIndex < stack.length) {
    updatedStack += stack.substr(lastIndex);
  }

  // sanitize with configured cleanup patterns

  for (const regexp of cleanupPatterns) {
    updatedStack = updatedStack.replace(regexp, "");
  }

  return updatedStack;
}

export function getConfiguration(key: string): boolean {
  const configuration: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration(CONFIGURATION_PREFIX);

  return configuration.get<boolean>(key, false);
}

export function syncFeatureFlags() {
  process.env["TEAMSFX_BICEP_ENV_CHECKER_ENABLE"] = getConfiguration(
    ConfigurationKey.BicepEnvCheckerEnable
  ).toString();

  initializePreviewFeatureFlags();
}

export class FeatureFlags {
  static readonly InsiderPreview = "__TEAMSFX_INSIDER_PREVIEW";
  static readonly TelemetryTest = "TEAMSFX_TELEMETRY_TEST";
  static readonly DevTunnelTest = "TEAMSFX_DEV_TUNNEL_TEST";
  static readonly Preview = "TEAMSFX_PREVIEW";
}

// Determine whether feature flag is enabled based on environment variable setting

export function isFeatureFlagEnabled(featureFlagName: string, defaultValue = false): boolean {
  const flag = process.env[featureFlagName];

  if (flag === undefined) {
    return defaultValue; // allows consumer to set a default value when environment variable not set
  } else {
    return flag === "1" || flag.toLowerCase() === "true"; // can enable feature flag by set environment variable value to "1" or "true"
  }
}

export function getAllFeatureFlags(): string[] | undefined {
  const result = Object.values(FeatureFlags)

    .filter((featureFlag) => {
      return isFeatureFlagEnabled(featureFlag);
    })

    .map((featureFlag) => {
      return featureFlag;
    });

  return result;
}

export async function getSubscriptionInfoFromEnv(
  env: string
): Promise<SubscriptionInfo | undefined> {
  let provisionResult: Json | undefined;

  try {
    provisionResult = await getProvisionResultJson(env);
  } catch (error) {
    // ignore error on tree view when load provision result failed.

    return undefined;
  }

  if (!provisionResult) {
    return undefined;
  }

  if (provisionResult.solution && provisionResult.solution.subscriptionId) {
    return {
      subscriptionName: provisionResult.solution.subscriptionName,

      subscriptionId: provisionResult.solution.subscriptionId,

      tenantId: provisionResult.solution.tenantId,
    };
  } else {
    return undefined;
  }
}

export async function getM365TenantFromEnv(env: string): Promise<string | undefined> {
  let provisionResult: Json | undefined;

  try {
    provisionResult = await getProvisionResultJson(env);
  } catch (error) {
    // ignore error on tree view when load provision result failed.
    return undefined;
  }

  if (!provisionResult) {
    return undefined;
  }

  return provisionResult?.[PluginNames.SOLUTION]?.teamsAppTenantId;
}

export async function getResourceGroupNameFromEnv(env: string): Promise<string | undefined> {
  let provisionResult: Json | undefined;

  try {
    provisionResult = await getProvisionResultJson(env);
  } catch (error) {
    // ignore error on tree view when load provision result failed.

    return undefined;
  }

  if (!provisionResult) {
    return undefined;
  }

  return provisionResult.solution.resourceGroupName;
}

export async function getProvisionSucceedFromEnv(env: string): Promise<boolean | undefined> {
  if (isV3Enabled()) {
    // If TEAMS_APP_ID is set, it's highly possible that the project is provisioned.
    try {
      const teamsAppId = await getV3TeamsAppId(globalVariables.workspaceUri!.fsPath, env);
      return teamsAppId !== "";
    } catch (error) {
      return false;
    }
  }
  let provisionResult: Json | undefined;

  try {
    provisionResult = await getProvisionResultJson(env);
  } catch (error) {
    // ignore error on tree view when load provision result failed.

    return undefined;
  }

  if (!provisionResult) {
    return undefined;
  }

  return provisionResult.solution?.provisionSucceeded;
}

async function getProvisionResultJson(env: string): Promise<Json | undefined> {
  if (globalVariables.workspaceUri) {
    if (!globalVariables.isTeamsFxProject) {
      return undefined;
    }

    const configRoot = await commonUtils.getProjectRoot(
      globalVariables.workspaceUri.fsPath,
      `.${ConfigFolderName}`
    );

    const provisionOutputFile = path.join(
      configRoot!,
      path.join(
        StatesFolderName,

        EnvStateFileNameTemplate.replace(EnvNamePlaceholder, env)
      )
    );

    if (!fs.existsSync(provisionOutputFile)) {
      return undefined;
    }

    const provisionResult = await fs.readJSON(provisionOutputFile);

    return provisionResult;
  }
}

export async function canUpgradeToArmAndMultiEnv(workspacePath?: string): Promise<boolean> {
  if (!workspacePath) return false;
  try {
    const fx = path.join(workspacePath, ".fx");
    if (!(await fs.pathExists(fx))) {
      return false;
    }
    const envFileExist = await fs.pathExists(path.join(fx, "env.default.json"));
    const configDirExist = await fs.pathExists(path.join(fx, "configs"));
    const armParameterExist = await fs.pathExists(
      path.join(fx, "configs", "azure.parameters.dev.json")
    );
    return envFileExist && (!armParameterExist || !configDirExist);
  } catch (err) {
    return false;
  }
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTriggerFromWalkThrough(args?: any[]): boolean {
  if (!args || (args && args.length === 0)) {
    return false;
  } else if (
    args[0].toString() === TelemetryTriggerFrom.WalkThrough ||
    args[0].toString() === TelemetryTriggerFrom.Notification
  ) {
    return true;
  }

  return false;
}

export function getTriggerFromProperty(args?: any[]) {
  // if not args are not supplied, by default, it is trigger from "CommandPalette"
  // e.g. vscode.commands.executeCommand("fx-extension.openWelcome");
  // in this case, "fx-exentiosn.openWelcome" is trigged from "CommandPalette".
  if (!args || (args && args.length === 0) || !args[0]) {
    return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CommandPalette };
  }

  switch (args[0].toString()) {
    case TelemetryTriggerFrom.TreeView:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.TreeView };
    case TelemetryTriggerFrom.ViewTitleNavigation:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.ViewTitleNavigation };
    case TelemetryTriggerFrom.QuickPick:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.QuickPick };
    case TelemetryTriggerFrom.Webview:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview };
    case TelemetryTriggerFrom.CodeLens:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CodeLens };
    case TelemetryTriggerFrom.EditorTitle:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.EditorTitle };
    case TelemetryTriggerFrom.SideBar:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.SideBar };
    case TelemetryTriggerFrom.Notification:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Notification };
    case TelemetryTriggerFrom.WalkThrough:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.WalkThrough };
    case TelemetryTriggerFrom.Auto:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Auto };
    case TelemetryTriggerFrom.Other:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Other };
    default:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Unknow };
  }
}
