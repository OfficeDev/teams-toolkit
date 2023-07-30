// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, ok } from "@microsoft/teamsfx-api";
import { envUtil } from "@microsoft/teamsfx-core";
import os from "os";
import path from "path";
import { WorkspaceNotSupported } from "../../cmds/preview/errors";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { isWorkspaceSupported } from "../../utils";
import { FolderOption } from "../common";
import { CLICommand } from "../types";

export const envListCommand: CLICommand = {
  name: "list",
  description: "List all environments.",
  options: [FolderOption],
  telemetry: {
    event: TelemetryEvent.GrantPermission,
  },
  handler: async (ctx) => {
    const projectDir = path.resolve((ctx.optionValues.folder as string) || process.cwd());
    if (!isWorkspaceSupported(projectDir)) {
      return err(WorkspaceNotSupported(projectDir));
    }
    const envListRes = await envUtil.listEnv(projectDir, true);
    if (envListRes.isErr()) {
      return err(envListRes.error);
    }
    const envList = envListRes.value.join(os.EOL);
    logger.info(envList);
    return ok(undefined);
  },
};
