// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import "./console/screen";
import { initializePreviewFeatureFlags, isCliNewUxEnabled } from "@microsoft/teamsfx-core";
import fs from "fs-extra";
import * as path from "path";
import { registerCommands } from "./cmds";
import { start as startNewUX } from "./commands/index";
import { CliTelemetryReporter } from "./commonlib/telemetry";
import * as constants from "./constants";
import { registerPrompts } from "./prompts";
import cliTelemetry from "./telemetry/cliTelemetry";
import { TelemetryEvent, TelemetryProperty } from "./telemetry/cliTelemetryEvents";
import { getVersion } from "./utils";

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
export async function start(): Promise<void> {
  initTelemetryReporter();
  registerPrompts();
  if (isCliNewUxEnabled()) {
    return startNewUX();
  }
  const argv = yargs(changeArgv(hideBin(process.argv))).parserConfiguration({
    "parse-numbers": false,
    "camel-case-expansion": false,
  });

  registerCommands(argv);
  argv
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
