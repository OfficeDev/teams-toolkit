// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { OfficeWholeStatus } from "./types";
import * as Status from "../../../chat/commands/nextstep/status";
import fs from "fs-extra";

export async function getWholeStatus(folder?: string): Promise<OfficeWholeStatus> {
  return Status.getWholeStatus(folder).then(async (status: OfficeWholeStatus) => {
    if (status.projectOpened) {
      if (folder !== undefined) {
        status.projectOpened.nodeModulesExist = await fs.pathExists(`${folder}/node_modules`);
      }
    }
    return status;
  });
}
