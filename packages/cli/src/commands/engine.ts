// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import {
  InputValidationError,
  MissingRequiredInputError,
  assembleError,
} from "@microsoft/teamsfx-core";
import { cloneDeep } from "lodash";
import { format } from "util";
import { TextType, colorize } from "../colorize";
import { logger } from "../commonlib/logger";
import { strings } from "../resource";
import CliTelemetry from "../telemetry/cliTelemetry";
import { helper } from "./helper";
import { CLICommand, CLICommandOption, CLIContext } from "./types";

// Licensed under the MIT license.
class CLIEngine {
  async start(rootCmd: CLICommand): Promise<void> {
    const root = cloneDeep(rootCmd);
    const args = process.argv.slice(2);

    // 1. find command
    const findRes = this.findCommand(rootCmd, args);
    const cmd = findRes.cmd;
    const remainingArgs = findRes.remainingArgs;
    // process.stdout.write("name:" + cmd.name + "\n");
    // console.log("find command:", cmd.fullName!);

    // 2. parse args
    const context = this.parseArgs(cmd, root, remainingArgs);

    // 3. --version
    if (context.globalOptionValues.version === true) {
      logger.info(rootCmd.version ?? "1.0.0");
      return;
    }

    // 4. --help
    if (context.globalOptionValues.help === true) {
      const helpText = helper.formatHelp(context.command, root);
      logger.info(helpText);
      return;
    }

    // 5. validate
    const validateRes = this.validateOptionsAndArguments(context.command);
    if (validateRes.isErr()) {
      this.processResult(context, validateRes.error);
      return;
    }

    // 6. run handler
    try {
      const handleRes = await context.command.handler(context);
      if (handleRes.isErr()) {
        this.processResult(context, handleRes.error);
      } else {
        this.processResult(context);
      }
    } catch (e) {
      const fxError = assembleError(e);
      this.processResult(context, fxError);
    }
  }

  findCommand(model: CLICommand, args: string[]): { cmd: CLICommand; remainingArgs: string[] } {
    let i = 0;
    let cmd = model;
    for (; i < args.length; i++) {
      const arg = args[i];
      const command = cmd.commands?.find((c) => c.name === arg);
      if (command) {
        cmd = command;
      } else {
        break;
      }
    }
    cmd.fullName = [model.name, ...args.slice(0, i)].join(" ");
    const command = cloneDeep(cmd);
    return { cmd: command, remainingArgs: args.slice(i) };
  }

  parseArgs(command: CLICommand, rootCommand: CLICommand, args: string[]): CLIContext {
    let i = 0;
    let j = 0;
    const context: CLIContext = {
      command: command,
      optionValues: {},
      globalOptionValues: {},
      argumentValues: [],
      telemetryProperties: {},
    };
    const options = (rootCommand.options || []).concat(command.options || []);
    for (; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith("-")) {
        const argName = arg.replace(/-/g, "");
        const option = options.find((o) => o.name === argName || o.shortName === argName);
        if (option) {
          if (option.type === "boolean") {
            if (args[i + 1] === "false") {
              option.value = false;
              ++i;
            } else if (args[i + 1] === "true") {
              option.value = true;
              ++i;
            } else {
              option.value = true;
            }
          } else {
            const value = args[++i];
            if (value) {
              option.value = value;
            }
          }
          const inputValues = command.options?.includes(option)
            ? context.optionValues
            : context.globalOptionValues;
          if (option.value !== undefined) inputValues[option.name] = option.value;
        }
      } else {
        if (command.arguments && command.arguments[j]) {
          command.arguments[j++].value = args[i];
          context.argumentValues.push(args[i]);
        }
      }
    }
    return context;
  }

  validateOptionsAndArguments(
    command: CLICommand
  ): Result<undefined, InputValidationError | MissingRequiredInputError> {
    if (command.options) {
      for (const option of command.options) {
        const res = this.validateOption(option);
        if (res.isErr()) {
          return err(res.error);
        }
      }
    }
    if (command.arguments) {
      for (const argument of command.arguments) {
        const res = this.validateOption(argument);
        if (res.isErr()) {
          return err(res.error);
        }
      }
    }
    return ok(undefined);
  }

  /**
   * validate option value
   */
  validateOption(
    option: CLICommandOption
  ): Result<undefined, InputValidationError | MissingRequiredInputError> {
    if (option.required && option.default === undefined && option.value === undefined) {
      return err(new MissingRequiredInputError(helper.formatOptionName(option, false)));
    }
    if (
      (option.type === "singleSelect" || option.type === "multiSelect") &&
      option.choices &&
      option.value !== undefined
    ) {
      if (option.type === "singleSelect") {
        if (!(option.choices as string[]).includes(option.value as string)) {
          return err(
            new InputValidationError(
              helper.formatOptionName(option, false),
              format(
                strings["error.InvalidOptionErrorReason"],
                option.value,
                option.choices.map((i) => JSON.stringify(i)).join(", ")
              )
            )
          );
        }
      } else {
        const values = option.value as string[];
        for (const v of values) {
          if (!(option.choices as string[]).includes(v)) {
            return err(
              new InputValidationError(
                helper.formatOptionName(option, false),
                format(
                  strings["error.InvalidOptionErrorReason"],
                  option.value,
                  option.choices.join(",")
                )
              )
            );
          }
        }
      }
    }
    return ok(undefined);
  }
  processResult(context: CLIContext, fxError?: FxError): void {
    if (context.command.telemetry) {
      if (fxError) {
        CliTelemetry.sendTelemetryErrorEvent(
          context.command.telemetry.event,
          fxError,
          context.telemetryProperties
        );
      } else {
        CliTelemetry.sendTelemetryEvent(
          context.command.telemetry.event,
          context.telemetryProperties
        );
      }
    }
    if (fxError) {
      logger.outputError(`${fxError.source}.${fxError.name}: ${fxError.message}`);
      if ("helpLink" in fxError && fxError["helpLink"]) {
        logger.outputError(
          `Get help from `,
          colorize(fxError["helpLink"] as string, TextType.Hyperlink)
        );
      }
      if ("issueLink" in fxError && fxError["issueLink"]) {
        logger.outputError(
          `Report this issue at `,
          colorize(fxError["issueLink"] as string, TextType.Hyperlink)
        );
      }
    }
  }
}

export const engine = new CLIEngine();
