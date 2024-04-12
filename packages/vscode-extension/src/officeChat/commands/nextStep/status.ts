// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { WholeStatus } from "../../../chat/commands/nextstep/types";
import * as Status from "../../../chat/commands/nextstep/status";
import * as fs from "fs-extra";

export async function getWholeStatus(folder?: string): Promise<WholeStatus> {
  return Status.getWholeStatus(folder).then(async (status) => {
    if (status.projectOpened) {
      status.projectOpened.nodeModulesExist = await fs.pathExists(`${folder}/node_modules`);
    }
    return status;
  });
}
