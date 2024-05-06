// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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

export const firstInstalledKey = "first-installation";

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
  const firstInstalled = await globalStateGet(firstInstalledKey, true);
  await globalStateUpdate(firstInstalledKey, false);
  return {
    firstInstalled,
    ...(await checkCredential()),
  };
}
