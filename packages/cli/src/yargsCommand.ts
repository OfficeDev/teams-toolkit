// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, exit, Options } from "yargs";

import { FxError, Result, SystemError, UserError, LogLevel, Colors } from "@microsoft/teamsfx-api";

import CLILogProvider from "./commonlib/log";
import * as constants from "./constants";
import { UnknownError } from "./error";
import CliTelemetryInstance, { CliTelemetry } from "./telemetry/cliTelemetry";
import { CliTelemetryReporter } from "./commonlib/telemetry";
import { readFileSync } from "fs";
import path from "path";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import Progress from "./console/progress";
import { getColorizedString, getSystemInputs } from "./utils";
import UI from "./userInteraction";
import activate from "./activate";
import { isUserCancelError } from "@microsoft/teamsfx-core";

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
   * the parameters that may be used by fx-core
   */
  public params: { [_: string]: Options } = {};

  /**
   * builds the command using supplied yargs handle.
   * @param yargs the yargs handle
   */
  abstract builder(yargs: Argv<any>): Argv<any> | Promise<Argv<any>>;

  /**
   * before running command, some command may modify the arguments that users input.
   * @param args originial arguments
   * @returns the modified arguments
   */
  public modifyArguments(args: { [argName: string]: any }): { [argName: string]: any } {
    return args;
  }

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
    args = this.modifyArguments(args);
    if ("verbose" in args && args.verbose) {
      CLILogProvider.setLogLevel(constants.CLILogLevel.verbose);
    }
    if ("debug" in args && args.debug) {
      CLILogProvider.setLogLevel(constants.CLILogLevel.debug);
    }
    if ("interactive" in args) {
      UI.interactive = args.interactive as boolean;
    }
    if (!UI.interactive) {
      UI.updatePresetAnswers(this.params, args);
    } else {
      const sameKeys = Object.keys(this.params).filter(
        (k) => k !== "folder" && k in args && args[k] !== undefined
      );
      if (sameKeys.length > 0) {
        /// only if there are intersects between parameters and arguments, show the log,
        /// because it means some parameters will be used by fx-core.
        CLILogProvider.necessaryLog(
          LogLevel.Info,
          `Some arguments are useless because the interactive mode is opened.` +
            ` If you want to run the command non-interactively, add '--interactive false' after your command` +
            ` or set the global setting by 'teamsfx config set interactive false'.`,
          true
        );
      }
    }

    const cliPackage = JSON.parse(readFileSync(path.join(__dirname, "/../package.json"), "utf8"));
    const reporter = new CliTelemetryReporter(
      cliPackage.aiKey,
      constants.cliTelemetryPrefix,
      cliPackage.version
    );
    CliTelemetry.setReporter(reporter);

    {
      const result = await activate();
      if (result.isOk()) {
        const inputs = getSystemInputs(args.folder as string);
        inputs.ignoreEnvInfo = true;
        const configResult = await result.value.getProjectConfigV3(inputs);
        if (configResult.isOk()) {
          CliTelemetry.setIsFromSample(configResult.value?.projectSettings?.isFromSample);
        }
      }
    }

    try {
      const result = await Correlator.run(
        this.runCommand.bind(this),
        args as { [argName: string]: string | string[] }
      );
      if (result.isErr()) {
        throw result.error;
      }
    } catch (e: any) {
      Progress.end(false);
      if (isUserCancelError(e)) {
        CLILogProvider.necessaryLog(LogLevel.Info, "User canceled.", true);
        return;
      }
      const FxError: UserError | SystemError = "source" in e ? e : UnknownError(e);
      CLILogProvider.necessaryLog(
        LogLevel.Error,
        `[${FxError.source}.${FxError.name}]: ${FxError.message}`
      );
      if ("helpLink" in FxError && FxError.helpLink) {
        CLILogProvider.necessaryLog(
          LogLevel.Error,
          getColorizedString([
            { content: "Get help from ", color: Colors.BRIGHT_RED },
            {
              content: `${FxError.helpLink}#${FxError.source}${FxError.name}`,
              color: Colors.BRIGHT_CYAN,
            },
          ])
        );
      }
      if ("issueLink" in FxError && FxError.issueLink) {
        CLILogProvider.necessaryLog(
          LogLevel.Error,
          getColorizedString([
            { content: "Report this issue at ", color: Colors.BRIGHT_RED },
            {
              content: `${FxError.issueLink}`,
              color: Colors.BRIGHT_CYAN,
            },
          ])
        );
      }
      if (CLILogProvider.getLogLevel() === constants.CLILogLevel.debug) {
        CLILogProvider.necessaryLog(LogLevel.Error, "Call stack:");
        CLILogProvider.necessaryLog(LogLevel.Error, FxError.stack || "undefined");
      }

      exit(-1, FxError);
    } finally {
      await CliTelemetryInstance.flush();
    }
    Progress.end(true);
  }
}
