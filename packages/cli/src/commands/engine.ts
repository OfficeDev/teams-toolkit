// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CLICommand,
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
  InputValidationError,
  MissingRequiredInputError,
  VersionState,
  assembleError,
  getHashedEnv,
  isUserCancelError,
} from "@microsoft/teamsfx-core";
import { cloneDeep, pick } from "lodash";
import { format } from "util";
import { TextType, colorize } from "../colorize";
import { logger } from "../commonlib/logger";
import { strings } from "../resource";
import CliTelemetry from "../telemetry/cliTelemetry";
import { helper } from "./helper";
import UI from "../userInteraction";
import { TelemetryProperty } from "../telemetry/cliTelemetryEvents";
import { cliSource } from "../constants";
import Progress from "../console/progress";
import { getSystemInputs } from "../utils";
import { createFxCore } from "../activate";
import path from "path";
import {
  MissingRequiredArgumentError,
  MissingRequiredOptionError,
  UnknownOptionError,
} from "../error";
import * as uuid from "uuid";

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
    if (context.globalOptionValues.version === true) {
      logger.info(rootCmd.version ?? "1.0.0");
      this.processResult(context);
      return;
    }

    // 4. --help
    if (context.globalOptionValues.help === true) {
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
      context.optionValues = pick(context.optionValues, ["projectPath"]);
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

  parseArgs(
    context: CLIContext,
    rootCommand: CLICommand,
    args: string[],
    debugLogs: string[]
  ): Result<undefined, UnknownOptionError | MissingRequiredOptionError> {
    const i = 0;
    let argumentIndex = 0;
    const command = context.command;
    const options = (rootCommand.options || []).concat(command.options || []);

    const list = cloneDeep(args);
    while (list.length) {
      const token = list.shift();
      if (!token) continue;
      if (token.startsWith("-") || token.startsWith("--")) {
        const trimmedToken = token.startsWith("--") ? token.substring(2) : token.substring(1);
        let key: string;
        let value: string | undefined;
        if (trimmedToken.includes("=")) {
          [key, value] = trimmedToken.split("=");
          //process key, value
          list.unshift(value);
        } else {
          key = trimmedToken;
        }
        const option = options.find((o) => o.name === key || o.shortName === key);
        if (option) {
          if (option.type === "boolean") {
            // boolean
            // try next token
            value = list[0];
            if (value) {
              if (value.toLowerCase() === "false") {
                option.value = false;
                list.shift();
              } else if (value.toLowerCase() === "true") {
                option.value = true;
                list.shift();
              } else {
                option.value = true;
              }
            } else {
              option.value = true;
            }
          } else if (option.type === "string") {
            // string
            value = list.shift();
            if (value) {
              option.value = value;
            }
          } else {
            // array
            value = list.shift();
            if (value) {
              if (option.value === undefined) {
                option.value = [];
              }
              const values = value.split(",");
              for (const v of values) {
                option.value.push(v);
              }
            }
          }
          const isCommandOption = command.options?.includes(option);
          const inputValues = isCommandOption ? context.optionValues : context.globalOptionValues;
          const inputKey = option.questionName || option.name;
          const logObject = {
            token: token,
            option: option.name,
            value: option.value,
            isGlobal: !isCommandOption,
          };
          if (option.value !== undefined) inputValues[inputKey] = option.value;
          debugLogs.push(`find option: ${JSON.stringify(logObject)}`);
        } else {
          return err(new UnknownOptionError(command.fullName, key));
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
            context.optionValues[option.name] = option.default;
            debugLogs.push(
              `set required option with default value, ${option.name}=${JSON.stringify(
                option.default
              )}`
            );
          } else if (
            !context.globalOptionValues.help &&
            !context.globalOptionValues.version &&
            context.globalOptionValues.interactive === false
          ) {
            return err(new MissingRequiredOptionError(command.fullName, option));
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
          } else if (
            !context.globalOptionValues.help &&
            !context.globalOptionValues.version &&
            context.globalOptionValues.interactive === false
          ) {
            return err(new MissingRequiredArgumentError(command.fullName, argument));
          }
        }
        // set argument value in optionValues
        if (argument.value !== undefined) {
          context.optionValues[i] = argument.value;
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
      return err(new MissingRequiredInputError(helper.formatOptionName(option, false), cliSource));
    }
    if (
      (option.type === "string" || option.type === "array") &&
      option.choices &&
      option.value !== undefined
    ) {
      if (option.type === "string") {
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
