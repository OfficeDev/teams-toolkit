// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, InputsWithProjectPath, err, ok } from "@microsoft/teamsfx-api";
import { PermissionGrantInputs, PermissionGrantOptions } from "@microsoft/teamsfx-core";
import { getFxCore } from "../../activate";
import { azureMessage, spfxMessage } from "../../cmds/permission";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ProjectFolderOption } from "../common";
import { MissingRequiredOptionError } from "../../error";

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
        "teamsfx permission grant -i false --teams-manifest-file ./appPackage/manifest.json --env dev --email other@email.com",
      description:
        "Grant permission for another Microsoft 365 account to collaborate on the Microsoft Teams app.",
    },
  ],
  handler: async (ctx) => {
    const inputs = ctx.optionValues as PermissionGrantInputs & InputsWithProjectPath;
    // print necessary messages
    logger.info(azureMessage);
    logger.info(spfxMessage);
    if (!ctx.globalOptionValues.interactive) {
      if (!inputs["manifest-file-path"] && !inputs["manifest-path"]) {
        return err(
          new MissingRequiredOptionError(
            "teamsfx permission grant",
            "--manifest-file-path or --manifest-path"
          )
        );
      }
    }
    // setAppTypeInputs(inputs);// app type input is unused in FxCore
    const core = getFxCore();
    const result = await core.grantPermission(inputs);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined);
  },
};
