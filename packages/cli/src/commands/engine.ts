// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CLICommand,
  CLICommandArgument,
  CLICommandOption,
  CLIContext,
  CLIFoundCommand,
  FxError,
  LogLevel,
  Platform,
  Result,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  Correlator,
  IncompatibleProjectError,
  VersionState,
  assembleError,
  getHashedEnv,
  isUserCancelError,
} from "@microsoft/teamsfx-core";
import { cloneDeep, pick } from "lodash";
import path from "path";
import * as uuid from "uuid";
import { createFxCore } from "../activate";
import { TextType, colorize } from "../colorize";
import { logger } from "../commonlib/logger";
import Progress from "../console/progress";
import {
  InvalidChoiceError,
  MissingRequiredArgumentError,
  MissingRequiredOptionError,
  UnknownOptionError,
} from "../error";
import CliTelemetry from "../telemetry/cliTelemetry";
import { TelemetryProperty } from "../telemetry/cliTelemetryEvents";
import UI from "../userInteraction";
import { getSystemInputs } from "../utils";
import { helper } from "./helper";

class CLIEngine {
  isBundledElectronApp(): boolean {
    return process.versions && process.versions.electron && !(process as any).defaultApp
      ? true
      : false;
  }
  async start(rootCmd: CLICommand): Promise<void> {
    const debugLogs: string[] = [];

    const root = cloneDeep(rootCmd);

    // 0. get user args
    const args = this.isBundledElectronApp() ? process.argv.slice(1) : process.argv.slice(2);
    debugLogs.push(`user argument list: ${JSON.stringify(args)}`);

    // 1. find command
    const findRes = this.findCommand(rootCmd, args);
    const foundCommand = findRes.cmd;
    const remainingArgs = findRes.remainingArgs;
    debugLogs.push(`find matched command: ${colorize(foundCommand.fullName, TextType.Commands)}`);

    const context: CLIContext = {
      command: foundCommand,
      optionValues: {},
      globalOptionValues: {},
      argumentValues: [],
      telemetryProperties: {},
    };

    if (context.command.telemetry) {
      CliTelemetry.sendTelemetryEvent(context.command.telemetry.event);
    }

    // 2. parse args
    const parseRes = this.parseArgs(context, root, remainingArgs, debugLogs);

    if (debugLogs.length) {
      for (const log of debugLogs) {
        logger.debug(log);
      }
    }
    if (parseRes.isErr()) {
      this.processResult(context, parseRes.error);
      return;
    }

    // 3. --version
    if (context.optionValues.version === true || context.globalOptionValues.version === true) {
      logger.info(rootCmd.version ?? "1.0.0");
      this.processResult(context);
      return;
    }

    // 4. --help
    if (context.optionValues.help === true || context.globalOptionValues.help === true) {
      const helpText = helper.formatHelp(
        context.command,
        context.command.fullName !== root.fullName ? root : undefined
      );
      logger.info(helpText);
      this.processResult(context);
      return;
    }

    // 5. validate
    if (!context.globalOptionValues.interactive) {
      const validateRes = this.validateOptionsAndArguments(context.command);
      if (validateRes.isErr()) {
        this.processResult(context, validateRes.error);
        return;
      }
    } else {
      // discard other options and args for interactive mode
      context.optionValues = pick(context.optionValues, [
        "projectPath",
        "correlationId",
        "platform",
      ]);
      logger.info(
        `Some arguments/options are useless because the interactive mode is opened.` +
          ` If you want to run the command non-interactively, add '--interactive false' after your command` +
          ` or set the global setting by 'teamsfx config set interactive false'.`
      );
    }

    try {
      // 6. version check
      const inputs = getSystemInputs(context.optionValues.projectPath as string);
      inputs.ignoreEnvInfo = true;
      const skipCommands = ["teamsfx new", "teamsfx new sample", "teamsfx upgrade"];
      if (!skipCommands.includes(context.command.fullName) && context.optionValues.projectPath) {
        const core = createFxCore();
        const res = await core.projectVersionCheck(inputs);
        if (res.isErr()) {
          throw res.error;
        } else {
          if (res.value.isSupport === VersionState.unsupported) {
            throw IncompatibleProjectError("core.projectVersionChecker.cliUseNewVersion");
          } else if (res.value.isSupport === VersionState.upgradeable) {
            const upgrade = await core.phantomMigrationV3(inputs);
            if (upgrade.isErr()) {
              throw upgrade.error;
            }
          }
        }
      }

      // 7. run handler
      if (context.command.handler) {
        const handleRes = await Correlator.run(context.command.handler, context);
        // const handleRes = await context.command.handler(context);
        if (handleRes.isErr()) {
          this.processResult(context, handleRes.error);
        } else {
          this.processResult(context);
        }
      } else {
        const helpText = helper.formatHelp(rootCmd);
        logger.info(helpText);
      }
    } catch (e) {
      Progress.end(false); // TODO to remove this in the future
      const fxError = assembleError(e);
      this.processResult(context, fxError);
    } finally {
      await CliTelemetry.flush();
      Progress.end(true); // TODO to remove this in the future
      if (context.command.name !== "preview") {
        // TODO: consider to remove the hardcode
        process.exit();
      }
    }
  }

  findCommand(
    model: CLICommand,
    args: string[]
  ): { cmd: CLIFoundCommand; remainingArgs: string[] } {
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
    const command: CLIFoundCommand = {
      fullName: [model.name, ...args.slice(0, i)].join(" "),
      ...cloneDeep(cmd),
    };
    return { cmd: command, remainingArgs: args.slice(i) };
  }

  optionInputKey(option: CLICommandOption | CLICommandArgument) {
    return option.questionName || option.name;
  }

  parseArgs(
    context: CLIContext,
    rootCommand: CLICommand,
    args: string[],
    debugLogs: string[]
  ): Result<undefined, UnknownOptionError> {
    const i = 0;
    let argumentIndex = 0;
    const command = context.command;
    const options = (rootCommand.options || []).concat(command.options || []);
    const optionName2OptionMap = new Map<string, CLICommandOption>();
    options.forEach((option) => {
      optionName2OptionMap.set(option.name, option);
      if (option.shortName) {
        optionName2OptionMap.set(option.shortName, option);
      }
    });
    const remainingArgs = cloneDeep(args);
    const findOption = (token: string) => {
      if (token.startsWith("-") || token.startsWith("--")) {
        const trimmedToken = token.startsWith("--") ? token.substring(2) : token.substring(1);
        let key: string;
        let value: string | undefined;
        if (trimmedToken.includes("=")) {
          [key, value] = trimmedToken.split("=");
          //process key, value
          remainingArgs.unshift(value);
        } else {
          key = trimmedToken;
        }
        const option = optionName2OptionMap.get(key);
        return {
          key: key,
          value: value,
          option: option,
        };
      }
      return undefined;
    };
    while (remainingArgs.length) {
      const token = remainingArgs.shift();
      if (!token) continue;
      if (token.startsWith("-") || token.startsWith("--")) {
        const findOptionRes = findOption(token);
        if (findOptionRes?.option) {
          const option = findOptionRes.option;
          if (option.type === "boolean") {
            // boolean: try next token
            const nextToken = remainingArgs[0];
            if (nextToken) {
              if (nextToken.toLowerCase() === "false") {
                option.value = false;
                remainingArgs.shift();
              } else if (nextToken.toLowerCase() === "true") {
                option.value = true;
                remainingArgs.shift();
              } else {
                // not a boolean value, no matter what next token is, current option value is true
                option.value = true;
              }
            } else {
              option.value = true;
            }
          } else if (option.type === "string") {
            // string
            const nextToken = remainingArgs[0];
            if (nextToken) {
              const findNextOptionRes = findOption(nextToken);
              if (findNextOptionRes?.option) {
                // next token is an option, current option value is undefined
              } else {
                option.value = nextToken;
              }
            }
          } else {
            // array
            const nextToken = remainingArgs.shift();
            if (nextToken) {
              const findNextOptionRes = findOption(nextToken);
              if (findNextOptionRes?.option) {
                // next token is an option, current option value is undefined
              } else {
                if (option.value === undefined) {
                  option.value = [];
                }
                const values = nextToken.split(",");
                for (const v of values) {
                  option.value.push(v);
                }
              }
            }
          }
          const isCommandOption = command.options?.includes(option);
          const inputValues = isCommandOption ? context.optionValues : context.globalOptionValues;
          const inputKey = this.optionInputKey(option);
          const logObject = {
            token: token,
            option: option.name,
            value: option.value,
            isGlobal: !isCommandOption,
          };
          if (option.value !== undefined) inputValues[inputKey] = option.value;
          debugLogs.push(`find option: ${JSON.stringify(logObject)}`);
        } else {
          return err(new UnknownOptionError(command.fullName, token));
        }
      } else {
        if (command.arguments && command.arguments[argumentIndex]) {
          command.arguments[argumentIndex++].value = args[i];
          context.argumentValues.push(args[i]);
        }
      }
    }
    // for required options or arguments, set default value if not set
    if (command.options) {
      for (const option of command.options) {
        if (option.required && option.value === undefined) {
          if (option.default !== undefined) {
            option.value = option.default;
            context.optionValues[this.optionInputKey(option)] = option.default;
            debugLogs.push(
              `set required option with default value, ${option.name}=${JSON.stringify(
                option.default
              )}`
            );
          }
        }
      }
    }
    if (command.arguments) {
      for (let i = 0; i < command.arguments.length; ++i) {
        const argument = command.arguments[i];
        if (argument.required && argument.value === undefined) {
          if (argument.default !== undefined) {
            argument.value = argument.default;
            context.argumentValues[i] = argument.default as string;
            debugLogs.push(
              `set required argument with default value, ${argument.name}=${JSON.stringify(
                argument.default
              )}`
            );
          }
        }
        // set argument value in optionValues
        if (argument.value !== undefined) {
          context.optionValues[this.optionInputKey(argument)] = argument.value;
        }
      }
    }

    // set log level
    const logLevel = context.globalOptionValues.debug ? LogLevel.Debug : LogLevel.Info;
    logger.logLevel = logLevel;

    // special process for global options
    // interactive
    context.globalOptionValues.interactive =
      context.globalOptionValues.interactive === false ? false : true;

    // set interactive into inputs, usage: if required inputs is not preset in non-interactive mode, FxCore will return Error instead of trigger UI
    context.optionValues.nonInteractive = !context.globalOptionValues.interactive;
    context.optionValues.correlationId = uuid.v4();
    context.optionValues.platform = Platform.CLI;
    // set projectPath
    const projectFolderOption = context.command.options?.find(
      (o) => o.questionName === "projectPath"
    );
    if (projectFolderOption) {
      // resolve projectPath
      const projectPath = path.resolve(projectFolderOption.value as string);
      projectFolderOption.value = projectPath;
      context.optionValues.projectPath = projectPath;
      if (projectPath) {
        CliTelemetry.withRootFolder(projectPath);
      }
    }

    UI.interactive = context.globalOptionValues.interactive as boolean;

    debugLogs.push(
      `parsed context: ${JSON.stringify(
        pick(context, ["optionValues", "globalOptionValues", "argumentValues"]),
        null,
        2
      )}`
    );
    return ok(undefined);
  }

  validateOptionsAndArguments(
    command: CLIFoundCommand
  ): Result<
    undefined,
    MissingRequiredOptionError | MissingRequiredArgumentError | InvalidChoiceError
  > {
    if (command.options) {
      for (const option of command.options) {
        const res = this.validateOption(command, option, "option");
        if (res.isErr()) {
          return err(res.error);
        }
      }
    }
    if (command.arguments) {
      for (const argument of command.arguments) {
        const res = this.validateOption(command, argument, "argument");
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
    command: CLIFoundCommand,
    option: CLICommandOption | CLICommandArgument,
    type: "option" | "argument"
  ): Result<undefined, MissingRequiredOptionError | MissingRequiredArgumentError> {
    if (option.required && option.default === undefined && option.value === undefined) {
      const error =
        type === "option"
          ? new MissingRequiredOptionError(command.fullName, option)
          : new MissingRequiredArgumentError(command.fullName, option);
      return err(error);
    }
    if (
      (option.type === "string" || option.type === "array") &&
      option.choices &&
      option.value !== undefined &&
      !option.skipValidation
    ) {
      if (option.type === "string") {
        if (!(option.choices as string[]).includes(option.value as string)) {
          return err(new InvalidChoiceError(command.fullName, option.value, option));
        }
      } else {
        const values = option.value as string[];
        for (const v of values) {
          if (!(option.choices as string[]).includes(v)) {
            return err(new InvalidChoiceError(command.fullName, v, option));
          }
        }
      }
    }
    return ok(undefined);
  }
  processResult(context: CLIContext, fxError?: FxError): void {
    if (context.command.telemetry) {
      if (context.optionValues.env) {
        context.telemetryProperties[TelemetryProperty.Env] = getHashedEnv(
          context.optionValues.env as string
        );
      }
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
      if (isUserCancelError(fxError)) {
        logger.info("User canceled.");
        return;
      }
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
