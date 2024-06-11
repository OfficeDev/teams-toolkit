// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { exec } from "child_process";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { format } from "util";
import { ConfigFolderName, SubscriptionInfo } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";
import { glob } from "glob";
import { workspace } from "vscode";
import { getProjectRoot, getV3TeamsAppId } from "../debug/commonUtils";
import { workspaceUri, isTeamsFxProject, core } from "../globalVariables";
import { TelemetryProperty, TelemetryTriggerFrom } from "../telemetry/extTelemetryEvents";
import { localize } from "./localizeUtils";

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
export async function getTeamsAppTelemetryInfoByEnv(
  env: string
): Promise<TeamsAppTelemetryInfo | undefined> {
  try {
    const ws = workspaceUri!.fsPath;
    if (isValidProject(ws)) {
      const projectInfoRes = await core.getProjectInfo(ws, env);
      if (projectInfoRes.isOk()) {
        const projectInfo = projectInfoRes.value;
        return {
          appId: projectInfo.teamsAppId,
          tenantId: projectInfo.m365TenantId,
        };
      }
    }
  } catch (e) {}
  return undefined;
}

export async function getAppName(): Promise<string | undefined> {
  if (!workspaceUri) {
    return undefined;
  }
  try {
    const ws = workspaceUri.fsPath;
    const nameRes = await core.getTeamsAppName(ws);
    if (nameRes.isOk() && nameRes.value != "") {
      return nameRes.value;
    }
  } catch (e) {}
  return undefined;
}

export function openFolderInExplorer(folderPath: string): void {
  const command = format('start "" "%s"', folderPath);
  exec(command);
}

export async function isM365Project(workspacePath: string): Promise<boolean> {
  const projectSettingsPath = path.resolve(
    workspacePath,
    `.${ConfigFolderName}`,
    "configs",
    "projectSettings.json"
  );

  if (await fs.pathExists(projectSettingsPath)) {
    const projectSettings = await fs.readJson(projectSettingsPath);
    return projectSettings.isM365;
  } else {
    return false;
  }
}

export async function getSubscriptionInfoFromEnv(
  env: string
): Promise<SubscriptionInfo | undefined> {
  let provisionResult: Record<string, any> | undefined;

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
enum PluginNames {
  SQL = "fx-resource-azure-sql",
  MSID = "fx-resource-identity",
  FE = "fx-resource-frontend-hosting",
  SPFX = "fx-resource-spfx",
  BOT = "fx-resource-bot",
  AAD = "fx-resource-aad-app-for-teams",
  FUNC = "fx-resource-function",
  SA = "fx-resource-simple-auth",
  LDEBUG = "fx-resource-local-debug",
  APIM = "fx-resource-apim",
  APPST = "fx-resource-appstudio",
  SOLUTION = "solution",
}
export async function getM365TenantFromEnv(env: string): Promise<string | undefined> {
  let provisionResult: Record<string, any> | undefined;

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
  let provisionResult: Record<string, any> | undefined;

  try {
    provisionResult = await getProvisionResultJson(env);
  } catch (error) {
    // ignore error on tree view when load provision result failed.

    return undefined;
  }

  if (!provisionResult) {
    return undefined;
  }

  return provisionResult.solution?.resourceGroupName;
}

export async function getProvisionSucceedFromEnv(env: string): Promise<boolean | undefined> {
  // If TEAMS_APP_ID is set, it's highly possible that the project is provisioned.
  try {
    const teamsAppId = await getV3TeamsAppId(workspaceUri!.fsPath, env);
    return teamsAppId !== "";
  } catch (error) {
    return false;
  }
}

export async function getProvisionResultJson(
  env: string
): Promise<Record<string, string> | undefined> {
  if (workspaceUri) {
    if (!isTeamsFxProject) {
      return undefined;
    }

    const configRoot = await getProjectRoot(workspaceUri.fsPath, `.${ConfigFolderName}`);

    const provisionOutputFile = path.join(configRoot!, path.join("states", `state.${env}.json`));

    if (!fs.existsSync(provisionOutputFile)) {
      return undefined;
    }

    const provisionResult = await fs.readJSON(provisionOutputFile);

    return provisionResult;
  }
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTriggerFromWalkThrough(args?: any[]): boolean {
  if (!args || (args && args.length === 0)) {
    return false;
  } else if (
    (args[0] as TelemetryTriggerFrom).toString() === TelemetryTriggerFrom.WalkThrough ||
    (args[0] as TelemetryTriggerFrom).toString() === TelemetryTriggerFrom.Notification
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

  switch ((args[0] as TelemetryTriggerFrom).toString()) {
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
    case TelemetryTriggerFrom.CopilotChat:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat };
    case TelemetryTriggerFrom.Auto:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Auto };
    case TelemetryTriggerFrom.ExternalUrl:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.ExternalUrl };
    case TelemetryTriggerFrom.Other:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Other };
    case TelemetryTriggerFrom.CreateAppQuestionFlow:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CreateAppQuestionFlow };
    default:
      return { [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Unknow };
  }
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
        // https://github.com/OfficeDev/TeamsFx/security/code-scanning/2664
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
  if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
    const workspaceFolder = workspace.workspaceFolders[0];
    const workspacePath: string = workspaceFolder.uri.fsPath;

    const testToolYamlPath = path.join(workspacePath, "teamsapp.testtool.yml");
    return fs.pathExists(testToolYamlPath);
  }

  return false;
}
