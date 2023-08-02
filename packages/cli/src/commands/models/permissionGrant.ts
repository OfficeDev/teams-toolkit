// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, err, ok } from "@microsoft/teamsfx-api";
import { PermissionGrantInputs, PermissionGrantOptions } from "@microsoft/teamsfx-core";
import { assign } from "lodash";
import { createFxCore } from "../../activate";
import { azureMessage, spfxMessage } from "../../cmds/permission";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { getSystemInputs } from "../../utils";
import { ProjectFolderOption } from "../common";

export const permissionGrantCommand: CLICommand = {
  name: "grant",
  description: "Grant permission for another account.",
  options: [...PermissionGrantOptions, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.GrantPermission,
  },
  handler: async (ctx) => {
    const inputs = getSystemInputs() as PermissionGrantInputs;
    assign(inputs, ctx.optionValues);
    // print necessary messages
    logger.info(azureMessage);
    logger.info(spfxMessage);
    // setAppTypeInputs(inputs);// app type input is unused in FxCore
    const core = createFxCore();
    const result = await core.grantPermission(inputs);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined);
  },
};
