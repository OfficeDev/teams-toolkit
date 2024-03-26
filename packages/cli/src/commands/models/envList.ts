// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath, err, ok } from "@microsoft/teamsfx-api";
import { envUtil, isValidProjectV3 } from "@microsoft/teamsfx-core";
import os from "os";
import { WorkspaceNotSupported } from "../../cmds/preview/errors";
import { logger } from "../../commonlib/logger";
import { commands } from "../../resource";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const envListCommand: CLICommand = {
  name: "list",
  description: commands["env.list"].description,
  options: [ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.GrantPermission,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as InputsWithProjectPath;
    if (!isValidProjectV3(inputs.projectPath)) {
      return err(WorkspaceNotSupported(inputs.projectPath));
    }
    const envListRes = await envUtil.listEnv(inputs.projectPath, true);
    if (envListRes.isErr()) {
      return err(envListRes.error);
    }
    const envList = envListRes.value.join(os.EOL);
    logger.info(envList);
    return ok(undefined);
  },
};
