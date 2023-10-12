// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, LogLevel, err, ok } from "@microsoft/teamsfx-api";
import { PackageService, serviceEndpoint } from "@microsoft/teamsfx-core";
import { getTokenAndUpn } from "../../cmds/m365/m365";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { ArgumentConflictError, MissingRequiredOptionError } from "../../error";

export const sideloadingServiceEndpoint =
  process.env.SIDELOADING_SERVICE_ENDPOINT ?? serviceEndpoint;

export const m365SideloadingCommand: CLICommand = {
  name: "install",
  aliases: ["sideloading"],
  description:
    "Sideloading an M365 App with corresponding information specified in the given manifest package.",
  options: [
    {
      name: "file-path",
      description: "Path to the App manifest zip package.",
      type: "string",
    },
    {
      name: "xml-path",
      description: "Path to the XML manifest xml file.",
      type: "string",
    },
  ],
  examples: [
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} m365 sideloading --file-path appPackage.zip`,
      description: "Sideloading the m365 app package",
    },
    {
      command: `${process.env.TEAMSFX_CLI_BIN_NAME} m365 sideloading --xml-path manifest.xml`,
      description: "Sideloading the m365 app based on the XML manifest file",
    },
  ],
  telemetry: {
    event: TelemetryEvent.M365Sigeloading,
  },
  defaultInteractiveOption: false,
  handler: async (ctx) => {
    // Command is preview, set log level to verbose
    logger.logLevel = logger.logLevel > LogLevel.Verbose ? LogLevel.Verbose : logger.logLevel;
    logger.warning("This command is in preview.");

    const zipAppPackagePath = ctx.optionValues["file-path"] as string;
    const xmlPath = ctx.optionValues["xml-path"] as string;

    if (zipAppPackagePath === undefined && xmlPath === undefined) {
      return err(new MissingRequiredOptionError(ctx.command.fullName, `--file-path or --xml-path`));
    }

    if (zipAppPackagePath !== undefined && xmlPath !== undefined) {
      return err(new ArgumentConflictError(ctx.command.fullName, `--file-path`, `--xml-path`));
    }

    const packageService = new PackageService(sideloadingServiceEndpoint, logger);
    const manifestPath =
      (ctx.optionValues["file-path"] as string) || (ctx.optionValues["xml-path"] as string);
    const tokenAndUpn = await getTokenAndUpn();
    if (ctx.optionValues["file-path"] !== undefined) {
      await packageService.sideLoading(tokenAndUpn[0], manifestPath);
    } else {
      await packageService.sideLoadXmlManifest(tokenAndUpn[0], manifestPath);
    }
    return ok(undefined);
  },
};
