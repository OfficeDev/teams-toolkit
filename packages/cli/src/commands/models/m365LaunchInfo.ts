// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, LogLevel, err, ok } from "@microsoft/teamsfx-api";
import { PackageService } from "@microsoft/teamsfx-core";
import { logger } from "../../commonlib/logger";
import { MissingRequiredOptionError } from "../../error";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { m365utils, sideloadingServiceEndpoint } from "./m365Sideloading";

export const m365LaunchInfoCommand: CLICommand = {
  name: "launchinfo",
  description: "Get launch information of an acquired M365 App.",
  options: [
    {
      name: "title-id",
      description: "Title ID of the acquired M365 App.",
      type: "string",
    },
    {
      name: "manifest-id",
      description: "Manifest ID of the acquired M365 App.",
      type: "string",
    },
  ],
  examples: [
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} m365 launchinfo --title-id U_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
      description: "Get launch information of the acquired M365 App by Title ID",
    },
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} m365 launchinfo --manifest-id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
      description: "Get launch information of the acquired M365 App by Manifest ID",
    },
  ],
  telemetry: {
    event: TelemetryEvent.M365LaunchInfo,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    // Command is preview, set log level to verbose
    logger.logLevel = logger.logLevel > LogLevel.Verbose ? LogLevel.Verbose : logger.logLevel;
    logger.warning("This command is in preview.");
    const packageService = new PackageService(sideloadingServiceEndpoint, logger);
    let titleId = ctx.optionValues["title-id"] as string;
    const manifestId = ctx.optionValues["manifest-id"] as string;
    if (titleId === undefined && manifestId === undefined) {
      return err(
        new MissingRequiredOptionError(ctx.command.fullName, `--title-id or --manifest-id`)
      );
    }
    const tokenAndUpn = await m365utils.getTokenAndUpn();
    if (titleId === undefined) {
      titleId = await packageService.retrieveTitleId(tokenAndUpn[0], manifestId);
    }
    await packageService.getLaunchInfoByTitleId(tokenAndUpn[0], titleId);
    return ok(undefined);
  },
};
