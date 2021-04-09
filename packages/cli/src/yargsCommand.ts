// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Argv, exit } from "yargs";

import { FxError, Result, SystemError, UserError } from "fx-api";

import CLILogProvider from "./commonlib/log";
import * as constants from "./constants";
import { UnknownError } from "./error";

export abstract class YargsCommand {
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
    [argName: string]: string | string[];
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
    try {
      const result = await this.runCommand(args as { [argName: string]: string | string[] });
      if (result.isErr()) {
        throw result.error;
      }
    } catch (e) {
      const FxError: FxError =
        e instanceof UserError || e instanceof SystemError ? e : UnknownError(e);
      let errorMsg = `code:${FxError.source}.${FxError.name}, message: ${FxError.message}`;
      if (FxError instanceof UserError && FxError.helpLink) {
        errorMsg += `, help link: ${FxError.helpLink}`;
      }
      if (FxError instanceof SystemError && FxError.issueLink) {
        errorMsg += `, issue link: ${FxError.issueLink}`;
      }
      if (CLILogProvider.getLogLevel() === constants.CLILogLevel.debug) {
        errorMsg += `, stack: ${FxError.stack}`;
      }
      CLILogProvider.error(errorMsg);
      exit(-1, FxError);
    }
  }
}
