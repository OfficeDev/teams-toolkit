// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand, ok } from "@microsoft/teamsfx-api";
import { FooterText } from "../../constants";
import { getVersion } from "../../utils";
import { accountCommand } from "./account";
import { addCommand } from "./add";
import { getCreateCommand } from "./create";
import { deployCommand } from "./deploy";
import { envCommand } from "./env";
import { m365Command } from "./m365";
import { packageCommand } from "./package";
import { permissionCommand } from "./permission";
import { previewCommand } from "./preview";
import { provisionCommand } from "./provision";
import { publishCommand } from "./publish";
import { updateCommand } from "./update";
import { upgradeCommand } from "./upgrade";
import { validateCommand } from "./validate";
import { listCommand } from "./list";
import { helper } from "../helper";
import { logger } from "../../commonlib/logger";
import { TelemetryEvent } from "../../telemetry/cliTelemetryEvents";
import { teamsappUpdateCommand } from "./teamsapp/update";
import { teamsappValidateCommand } from "./teamsapp/validate";
import { teamsappPackageCommand } from "./teamsapp/package";
import { teamsappPublishCommand } from "./teamsapp/publish";
import { isCliV3Enabled } from "@microsoft/teamsfx-core";
import { teamsappDoctorCommand } from "./teamsapp/doctor";

export const helpCommand: CLICommand = {
  name: "help",
  description: "Show Microsoft Teams Toolkit CLI help.",
  handler: (ctx) => {
    const helpText = helper.formatHelp(rootCommand, undefined);
    logger.info(helpText);
    return ok(undefined);
  },
};
export const rootCommand: CLICommand = {
  name: "teamsapp",
  fullName: "teamsapp",
  description: "Microsoft Teams Toolkit CLI.",
  version: getVersion(),
  footer: FooterText,
  commands: [
    accountCommand,
    getCreateCommand(),
    addCommand,
    provisionCommand,
    deployCommand,
    previewCommand,
    envCommand,
    permissionCommand,
    upgradeCommand,
    m365Command,
    listCommand,
    helpCommand,
    ...(isCliV3Enabled()
      ? [
          teamsappUpdateCommand,
          teamsappValidateCommand,
          teamsappPackageCommand,
          teamsappPublishCommand,
          teamsappDoctorCommand,
        ]
      : [packageCommand, updateCommand, validateCommand, publishCommand]),
  ],
  sortCommands: true,
  options: [
    {
      type: "boolean",
      name: "version",
      shortName: "v",
      description: "Display Microsoft Teams Toolkit CLI version.",
    },
    {
      type: "boolean",
      name: "help",
      shortName: "h",
      description: "Show Microsoft Teams Toolkit CLI help.",
    },
    {
      type: "boolean",
      name: "interactive",
      shortName: "i",
      description: "Run the command in interactive mode.",
      default: true,
    },
    {
      type: "boolean",
      name: "debug",
      description: "Print debug information.",
      default: false,
    },
    {
      type: "boolean",
      name: "verbose",
      description: "Print diagnostic information.",
      default: false,
    },
    {
      type: "boolean",
      name: "telemetry",
      description: "Whether to enable telemetry.",
      default: true,
    },
  ],
  telemetry: {
    event: TelemetryEvent.RootCommand,
  },
};
