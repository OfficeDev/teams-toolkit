// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath, err, ok } from "@microsoft/teamsfx-api";
import { envUtil } from "@microsoft/teamsfx-core";
import os from "os";
import { WorkspaceNotSupported } from "../../cmds/preview/errors";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { isWorkspaceSupported } from "../../utils";
import { ProjectFolderOption } from "../common";

export const envListCommand: CLICommand = {
  name: "list",
  description: "List all environments.",
  options: [ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.GrantPermission,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as InputsWithProjectPath;
    if (!isWorkspaceSupported(inputs.projectPath)) {
      return err(WorkspaceNotSupported(inputs.projectPath));
    }
    const envListRes = await envUtil.listEnv(inputs.projectPath, true);
    if (envListRes.isErr()) {
      return err(envListRes.error);
    }
    const envList = envListRes.value.join(os.EOL);
    await logger.info(envList);
    return ok(undefined);
  },
};
