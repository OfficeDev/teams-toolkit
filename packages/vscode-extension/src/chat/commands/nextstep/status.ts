// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { CommandKey } from "../../../constants";
import { validateGetStartedPrerequisitesHandler } from "../../../handlers";
import { TelemetryTriggerFrom } from "../../../telemetry/extTelemetryEvents";
import {
  getFileModifiedTime,
  getLaunchJSON,
  getProjectStatus,
  getREADME,
} from "../../../utils/projectStatusUtils";
import {
  checkCredential,
  getFixedCommonProjectSettings,
  globalStateGet,
  globalStateUpdate,
} from "./helper";
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
    const nodeModulesExist = await fs.pathExists(`${folder}/node_modules`);

    return {
      machineStatus: await getMachineStatus(),
      projectOpened: {
        path: folder,
        projectId,
        codeModifiedTime,
        readmeContent: await getREADME(folder),
        actionStatus,
        launchJSONContent: await getLaunchJSON(folder),
        nodeModulesExist: nodeModulesExist,
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
  return {
    firstInstalled,
    resultOfPrerequistes,
    ...(await checkCredential()),
  };
}
