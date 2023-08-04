// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath } from "@microsoft/teamsfx-api";
import { PermissionListInputs, PermissionListOptions } from "@microsoft/teamsfx-core";
import { createFxCore } from "../../activate";
import { azureMessage, spfxMessage } from "../../cmds/permission";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const permissionStatusCommand: CLICommand = {
  name: "status",
  description: "Check user's permission.",
  options: [
    ...PermissionListOptions,
    {
      name: "all",
      shortName: "a",
      description: "Whether to list all collaborators.",
      type: "boolean",
      required: false,
    },
    ProjectFolderOption,
  ],
  telemetry: {
    event: TelemetryEvent.CheckPermission,
  },
  handler: async (ctx) => {
    const inputs = ctx.optionValues as PermissionListInputs & InputsWithProjectPath;
    const listAll = inputs.all || false;
    const core = createFxCore();
    // print necessary messages
    logger.info(azureMessage);
    logger.info(spfxMessage);
    const result = listAll
      ? await core.listCollaborator(inputs)
      : await core.checkPermission(inputs);
    return result;
  },
};
