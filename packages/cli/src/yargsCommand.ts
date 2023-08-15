// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, LogLevel, Result, SystemError, UserError } from "@microsoft/teamsfx-api";
import {
  Correlator,
  IncompatibleProjectError,
  UnhandledError,
  VersionState,
  isUserCancelError,
  assembleError,
} from "@microsoft/teamsfx-core";
import { Argv, Options, exit } from "yargs";
import activate from "./activate";
import { TextType, colorize } from "./colorize";
import CLILogProvider from "./commonlib/log";
import Progress from "./console/progress";
import * as constants from "./constants";
import CliTelemetryInstance from "./telemetry/cliTelemetry";
import UI from "./userInteraction";
import { getSystemInputs } from "./utils";

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

    try {
      {
        const result = await activate();
        if (result.isOk()) {
          const inputs = getSystemInputs(args.folder as string);
          inputs.ignoreEnvInfo = true;
          const skipCommands = ["new", "template", "infra", "debug", "upgrade"];
          if (!skipCommands.includes(this.commandHead) && args.folder && !args.global) {
            const res = await result.value.projectVersionCheck(inputs);
            if (res.isErr()) {
              throw res.error;
            } else {
              if (res.value.isSupport === VersionState.unsupported) {
                throw IncompatibleProjectError("core.projectVersionChecker.cliUseNewVersion");
              } else if (res.value.isSupport === VersionState.upgradeable) {
                const upgrade = await result.value.phantomMigrationV3(inputs);
                if (upgrade.isErr()) {
                  throw upgrade.error;
                } else {
                  return;
                }
              }
            }
          }
        }
      }

      const result = await Correlator.run(
        this.runCommand.bind(this),
        args as { [argName: string]: string | string[] }
      );
      if (result.isErr()) {
        throw result.error;
      }
    } catch (e: any) {
      Progress.end(false);

      const FxError = assembleError(e, constants.cliSource);

      printError(FxError);

      exit(-1, FxError);
    } finally {
      await CliTelemetryInstance.flush();
      Progress.end(true);
      if (this.commandHead !== "preview") {
        /// TODO: consider to remove the hardcode
        process.exit();
      }
    }
  }
}

export function printError(fxError: FxError): void {
  if (isUserCancelError(fxError)) {
    CLILogProvider.necessaryLog(LogLevel.Info, "User canceled.", true);
    return;
  }
  CLILogProvider.outputError(
    `${fxError.source}.${fxError.name}: ${fxError.message || fxError.innerError?.message}`
  );
  if (fxError instanceof UserError && fxError.helpLink) {
    CLILogProvider.outputError(`Get help from %s`, colorize(fxError.helpLink, TextType.Hyperlink));
  }
  if (fxError instanceof SystemError && fxError.issueLink) {
    CLILogProvider.outputError(
      `Report this issue at %s`,
      colorize(fxError.issueLink, TextType.Hyperlink)
    );
  }
  if (CLILogProvider.getLogLevel() === constants.CLILogLevel.debug) {
    CLILogProvider.outputError(`Call stack: ${fxError.stack || fxError.innerError?.stack || ""}`);
  }
}
