// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath, err, ok } from "@microsoft/teamsfx-api";
import { PermissionGrantInputs, PermissionGrantOptions } from "@microsoft/teamsfx-core";
import { createFxCore } from "../../activate";
import { azureMessage, spfxMessage } from "../../cmds/permission";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";

export const permissionGrantCommand: CLICommand = {
  name: "grant",
  description: "Grant permission for another account.",
  options: [...PermissionGrantOptions, ProjectFolderOption],
  telemetry: {
    event: TelemetryEvent.GrantPermission,
  },
  examples: [
    {
      command:
        "teamsfx permission grant --teams-manifest-file ./appPackage/manifest.json --env dev --email other@email.com",
      description:
        "Grant permission for another Microsoft 365 account to collaborate on the Teams app.",
    },
  ],
  handler: async (ctx) => {
    const inputs = ctx.optionValues as PermissionGrantInputs & InputsWithProjectPath;
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
