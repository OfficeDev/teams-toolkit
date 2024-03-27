// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigFolderName, Result } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as os from "os";
import { ProjectActionStatus } from "../chat/commands/nextstep/types";
import { CommandKey } from "../constants";
import { getFixedCommonProjectSettings } from "@microsoft/teamsfx-core";

const projectStatusFilePath = os.homedir() + `/.${ConfigFolderName}/projectStates.json`;

export const RecordedActions: (keyof ProjectActionStatus)[] = [
  CommandKey.Provision,
  CommandKey.Deploy,
  CommandKey.Publish,
  CommandKey.OpenReadMe,
];

export function emptyProjectStatus(): ProjectActionStatus {
  return {
    [CommandKey.LocalDebug]: { result: "no run", time: new Date(0) },
    [CommandKey.Provision]: { result: "no run", time: new Date(0) },
    [CommandKey.Deploy]: { result: "no run", time: new Date(0) },
    [CommandKey.Publish]: { result: "no run", time: new Date(0) },
    [CommandKey.OpenReadMe]: { result: "no run", time: new Date(0) },
  };
}

export async function getProjectStatus(projectId: string): Promise<ProjectActionStatus> {
  let status = emptyProjectStatus();
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
      status = { ...status, ...json[projectId] };
    } catch (e) {
      console.error(e);
    }
  }
  return status;
}

export async function updateProjectStatus(
  fsPath: string,
  commandName: string,
  result: Result<unknown, Error>,
  forced = false
) {
  const projectSettings = getFixedCommonProjectSettings(fsPath);
  const p = projectSettings?.projectId ?? fsPath;
  const actions = RecordedActions.map((x) => x.toString());
  if (actions.includes(commandName) || forced) {
    /// save project action running status
    const status = await getProjectStatus(p);
    status[commandName as keyof ProjectActionStatus] = {
      result: result.isOk() ? "success" : "fail",
      time: new Date(),
    };
    let json: any = {};
    if (await fs.pathExists(projectStatusFilePath)) {
      try {
        json = JSON.parse(await fs.readFile(projectStatusFilePath, "utf8"));
      } catch (e) {
        console.error(e);
      }
    }
    try {
      json[p] = status;
      await fs.writeFile(projectStatusFilePath, JSON.stringify(json, null, 2));
    } catch (e) {
      console.error(e);
    }
  }
}
