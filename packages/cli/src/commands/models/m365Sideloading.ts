// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import { PackageService, serviceEndpoint } from "@microsoft/teamsfx-core";
import { getTokenAndUpn } from "../../cmds/m365/m365";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";

export const sideloadingServiceEndpoint =
  process.env.SIDELOADING_SERVICE_ENDPOINT ?? serviceEndpoint;

export const m365SideloadingCommand: CLICommand = {
  name: "sideloading",
  description:
    "Sideloading an M365 App with corresponding information specified in the given manifest package.",
  options: [
    {
      name: "file-path",
      description: "Path to the App manifest zip package.",
      type: "string",
      required: true,
    },
  ],
  examples: [
    {
      command: "teamsfx m365 sideloading --file-path appPackage.zip",
      description: "Sideloading the m365 app package",
    },
  ],
  telemetry: {
    event: TelemetryEvent.M365Sigeloading,
  },
  handler: async (ctx) => {
    logger.warning("This command is in preview.");
    const packageService = new PackageService(sideloadingServiceEndpoint, logger);
    const manifestPath = ctx.optionValues["file-path"] as string;
    const tokenAndUpn = await getTokenAndUpn();
    await packageService.sideLoading(tokenAndUpn[0], manifestPath);
    return ok(undefined);
  },
};
