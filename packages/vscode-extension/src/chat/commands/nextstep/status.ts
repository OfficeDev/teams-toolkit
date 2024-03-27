// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioScopes,
  getFixedCommonProjectSettings,
  globalStateGet,
  globalStateUpdate,
} from "@microsoft/teamsfx-core";
import * as fs from "fs-extra";
import { glob } from "glob";
import { AzureAccountManager } from "../../../commonlib/azureLogin";
import { signedIn } from "../../../commonlib/common/constant";
import { M365Login } from "../../../commonlib/m365Login";
import { CommandKey } from "../../../constants";
import { validateGetStartedPrerequisitesHandler } from "../../../handlers";
import { TelemetryTriggerFrom } from "../../../telemetry/extTelemetryEvents";
import { getProjectStatus } from "../../../utils/projectStatusUtils";
import { MachineStatus, WholeStatus } from "./types";

const welcomePageKey = "ms-teams-vscode-extension.welcomePage.shown";

export async function getWholeStatus(folder?: string): Promise<WholeStatus> {
  if (!folder) {
    return {
      machineStatus: await getMachineStatus(),
    };
  } else {
    const projectSettings = getFixedCommonProjectSettings(folder);
    const projectId = projectSettings?.projectId;
    const actionStatus = await getProjectStatus(projectId ?? folder);
    const codeModifiedTime = {
      source: await getFileModifiedTime(`${folder.split("\\").join("/")}/**/*.{ts,tsx,js,jsx}`),
      infra: await getFileModifiedTime(`${folder.split("\\").join("/")}/infra/**/*`),
    };

    return {
      machineStatus: await getMachineStatus(),
      projectOpened: {
        path: folder,
        projectId,
        codeModifiedTime,
        readmeContent: await getREADME(folder),
        actionStatus,
        launchJSONContent: await getLaunchJSON(folder),
      },
    };
  }
}

export async function getMachineStatus(): Promise<MachineStatus> {
  const firstInstalled = !(await globalStateGet(welcomePageKey, false));
  const preCheckTime = new Date(
    Date.parse(
      await globalStateGet(CommandKey.ValidateGetStartedPrerequisites, new Date(0).toString())
    )
  );
  let resultOfPrerequistes: string | undefined = undefined;
  if (Date.now() - preCheckTime.getTime() > 6 * 60 * 60 * 1000) {
    const result = await validateGetStartedPrerequisitesHandler(TelemetryTriggerFrom.CopilotChat);
    resultOfPrerequistes = result.isErr() ? result.error.message : undefined;
    if (!resultOfPrerequistes) {
      await globalStateUpdate(CommandKey.ValidateGetStartedPrerequisites, new Date());
    }
  }
  const m365Status = await M365Login.getInstance().getStatus({ scopes: AppStudioScopes });
  const azureStatus = await AzureAccountManager.getInstance().getStatus();
  return {
    firstInstalled,
    resultOfPrerequistes,
    m365LoggedIn: m365Status.isOk() && m365Status.value.status === signedIn,
    azureLoggedIn: azureStatus.status === signedIn,
  };
}

export async function getFileModifiedTime(pattern: string): Promise<Date> {
  const files = await glob(pattern, { ignore: "node_modules/**" });
  let lastModifiedTime = new Date(0);
  for (const file of files) {
    const stat = await fs.stat(file);
    if (stat.mtime > lastModifiedTime) {
      lastModifiedTime = stat.mtime;
    }
  }
  return lastModifiedTime;
}

export async function getREADME(folder: string): Promise<string | undefined> {
  const readmePath = `${folder}/README.md`;
  if (await fs.pathExists(readmePath)) {
    return await fs.readFile(readmePath, "utf-8");
  }
  return undefined;
}

export async function getLaunchJSON(folder: string): Promise<string | undefined> {
  const launchJSONPath = `${folder}/.vscode/launch.json`;
  if (await fs.pathExists(launchJSONPath)) {
    return await fs.readFile(launchJSONPath, "utf-8");
  }
  return undefined;
}
