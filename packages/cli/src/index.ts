// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { initializePreviewFeatureFlags, isCliNewUxEnabled } from "@microsoft/teamsfx-core";
import fs from "fs-extra";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { registerCommands } from "./cmds";
import { start as startNewUX } from "./commands/index";
import { CliTelemetryReporter } from "./commonlib/telemetry";
import "./console/screen";
import * as constants from "./constants";
import cliTelemetry from "./telemetry/cliTelemetry";
import { getVersion } from "./utils";
import { TelemetryProperty } from "./telemetry/cliTelemetryEvents";

initializePreviewFeatureFlags();

function changeArgv(argv: string[]): string[] {
  return argv.map((s) => (s.startsWith("--") ? s.toLocaleLowerCase() : s));
}

export function initTelemetryReporter(): void {
  const cliPackage = JSON.parse(fs.readFileSync(path.join(__dirname, "/../package.json"), "utf8"));
  const reporter = new CliTelemetryReporter(
    cliPackage.aiKey,
    constants.cliTelemetryPrefix,
    cliPackage.version
  );
  cliTelemetry.reporter = reporter;
}

/**
 * Starts the CLI process.
 */
export async function start(binName: "teamsfx" | "teamsapp"): Promise<void> {
  initTelemetryReporter();
  cliTelemetry.reporter?.addSharedProperty(TelemetryProperty.BinName, binName); // trigger binary name for telemetry
  if (isCliNewUxEnabled()) {
    return startNewUX(binName);
  }
  const argv = yargs(changeArgv(hideBin(process.argv))).parserConfiguration({
    "parse-numbers": false,
    "camel-case-expansion": false,
  });

  registerCommands(argv);
  void argv
    .options("verbose", {
      description: "Print additional information.",
      boolean: true,
      default: false,
    })
    .options("debug", {
      description: "Print diagnostic information.",
      boolean: true,
      default: false,
    })
    .options("interactive", {
      description: "Run the command interactively.",
      boolean: true,
    })
    .detectLocale(false)
    .demandCommand()
    .scriptName(constants.cliName)
    .help()
    .strict()
    .showHelpOnFail(false, "Specify --help for available options")
    .alias("help", "h")
    .alias("v", "version")
    .version(getVersion())
    .wrap(Math.min(100, yargs.terminalWidth()))
    .epilogue("For more information about the Teams Toolkit - https://aka.ms/teamsfx-cli.").argv;
}
