// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, exit } from "yargs";

import { FxError, Result, SystemError, UserError, LogLevel } from "@microsoft/teamsfx-api";

import CLILogProvider from "./commonlib/log";
import * as constants from "./constants";
import { UnknownError } from "./error";
import CliTelemetryInstance, { CliTelemetry } from "./telemetry/cliTelemetry";
import { CliTelemetryReporter } from "./commonlib/telemetry";
import { readFileSync } from "fs";
import path from "path";
import { Correlator } from "@microsoft/teamsfx-core";

export abstract class YargsCommand {
  /**
   * the yargs command head.
   */
  abstract readonly commandHead: string;

  /**
   * the yargs command.
   */
  abstract readonly command: string;

  /**
   * the yargs description of the command.
   */
  abstract readonly description: string;

  /**
   * builds the command using supplied yargs handle.
   * @param yargs the yargs handle
   */
  abstract builder(yargs: Argv): Argv<any>;

  /**
   * runs the command, args from command line are provided.
   * @param args the cli arguments supplied when running the command
   * @returns void or number. Where number is retured this causes yargs to terminate and becomes the yargs exit code.
   */
  abstract runCommand(args: {
    [argName: string]: string | string[] | undefined;
  }): Promise<Result<any, FxError>>;

  /**
   * handler supplied to yargs that provides behavior of allowing package.json scripts to overried
   * the command
   * @todo add telemetry && log
   * @param args the cli arguments supplied when running the command
   */
  public async handler(args: { [argName: string]: boolean | string | string[] }): Promise<void> {
    if ("verbose" in args && args.verbose) {
      CLILogProvider.setLogLevel(constants.CLILogLevel.verbose);
    }
    if ("debug" in args && args.debug) {
      CLILogProvider.setLogLevel(constants.CLILogLevel.debug);
    }

    const cliPackage = JSON.parse(readFileSync(path.join(__dirname, "/../package.json"), "utf8"));
    const reporter = new CliTelemetryReporter(
      cliPackage.aiKey,
      constants.cliTelemetryPrefix,
      cliPackage.version
    );
    CliTelemetry.setReporter(reporter);

    try {
      const result = await Correlator.run(
        this.runCommand.bind(this),
        args as { [argName: string]: string | string[] }
      );
      if (result.isErr()) {
        throw result.error;
      }
    } catch (e) {
      const FxError: UserError | SystemError = "source" in e ? e : UnknownError(e);
      CLILogProvider.necessaryLog(
        LogLevel.Error,
        `[${FxError.source}.${FxError.name}]: ${FxError.message}`
      );
      if ("helpLink" in FxError && FxError.helpLink) {
        CLILogProvider.necessaryLog(
          LogLevel.Error,
          `Get help from ${CLILogProvider.linkColor(
            `${FxError.helpLink}#${FxError.source}${FxError.name}`
          )}`
        );
      }
      if ("issueLink" in FxError && FxError.issueLink) {
        CLILogProvider.necessaryLog(
          LogLevel.Error,
          `Report this issue at ${CLILogProvider.linkColor(FxError.issueLink)}`
        );
      }
      if (CLILogProvider.getLogLevel() === constants.CLILogLevel.debug) {
        CLILogProvider.necessaryLog(LogLevel.Error, "Call stack:");
        CLILogProvider.necessaryLog(LogLevel.Error, FxError.stack || "undefined");
      }

      await CliTelemetryInstance.flush();
      exit(-1, FxError);
    }

    await CliTelemetryInstance.flush();
  }
}
