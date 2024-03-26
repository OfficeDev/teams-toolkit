// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigFolderName } from "@microsoft/teamsfx-api";
import {
  AppStudioScopes,
  getFixedCommonProjectSettings,
  globalStateGet,
  globalStateUpdate,
} from "@microsoft/teamsfx-core";
import * as fs from "fs-extra";
import { glob } from "glob";
import * as os from "os";
// import AzureTokenInstance from "../../../commonlib/azureLogin";
import { signedIn } from "../../../commonlib/common/constant";
// import M365TokenInstance from "../../../commonlib/m365Login";
import { CommandKey } from "../../../constants";
import { chatExecuteCommandHandler } from "./nextstepCommandHandler";
import { MachineStatus, ProjectActionStatus, WholeStatus } from "./types";

const welcomePageKey = "ms-teams-vscode-extension.welcomePage.shown";
const projectStatusFilePath = os.homedir() + `/.${ConfigFolderName}/projectStates.json`;

export function emptyProjectStatus(): ProjectActionStatus {
  return {
    [CommandKey.DebugInTestToolFromMessage]: { result: "no run", time: new Date(0) },
    [CommandKey.LocalDebug]: { result: "no run", time: new Date(0) },
    [CommandKey.Provision]: { result: "no run", time: new Date(0) },
    [CommandKey.Deploy]: { result: "no run", time: new Date(0) },
    [CommandKey.Publish]: { result: "no run", time: new Date(0) },
    [CommandKey.OpenReadMe]: { result: "no run", time: new Date(0) },
  };
}

export async function getWholeStatus(folder?: string): Promise<WholeStatus> {
  if (!folder) {
    return {
      machineStatus: await getMachineStatus(),
    };
  } else {
    const projectSettings = getFixedCommonProjectSettings(folder);
    const projectId = projectSettings?.projectId;
    const actionStatus = (await getProjectStatus(projectId ?? folder)) ?? emptyProjectStatus();
    const codeModifiedTime = {
      source: await getFileModifiedTime(`${folder}/**/*.{ts,tsx,js,jsx}`),
      infra: await getFileModifiedTime(`${folder}/infra/**/*`),
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
    const result = await chatExecuteCommandHandler(CommandKey.ValidateGetStartedPrerequisites);
    resultOfPrerequistes = result.isErr() ? result.error.message : undefined;
    if (!resultOfPrerequistes) {
      await globalStateUpdate(CommandKey.ValidateGetStartedPrerequisites, new Date());
    }
  }
  // const m365Status = await M365TokenInstance.getStatus({ scopes: AppStudioScopes });
  // const azureStatus = await AzureTokenInstance.getStatus();
  return {
    firstInstalled,
    resultOfPrerequistes,
    m365LoggedIn: true,
    azureLoggedIn: true,
    // m365LoggedIn: m365Status.isOk() && m365Status.value.status === signedIn,
    // azureLoggedIn: azureStatus.status === signedIn,
  };
}

export async function getProjectStatus(
  projectId: string
): Promise<ProjectActionStatus | undefined> {
  if (await fs.pathExists(projectStatusFilePath)) {
    try {
      const content = await fs.readFile(projectStatusFilePath, "utf8");
      const json = JSON.parse(content, (_, value) => {
        const date = Date.parse(value);
        if (!isNaN(date)) {
          return new Date(date);
        } else {
          return value;
        }
      });
      return json[projectId] as ProjectActionStatus;
    } catch (e) {
      console.error(e);
    }
  }
  return undefined;
}

export async function saveProjectStatus(projectId: string, status: ProjectActionStatus) {
  let content = "{}";
  if (await fs.pathExists(projectStatusFilePath)) {
    try {
      content = await fs.readFile(projectStatusFilePath, "utf8");
    } catch (e) {
      console.error(e);
    }
  }
  try {
    const json = JSON.parse(content);
    json[projectId] = status;
    await fs.writeFile(projectStatusFilePath, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(e);
  }
}

export async function getFileModifiedTime(pattern: string): Promise<Date> {
  const files = glob.sync(pattern);
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
