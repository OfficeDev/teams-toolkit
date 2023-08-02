// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CLICommand,
  CLICommandOption,
  CLIContext,
  FxError,
  LogLevel,
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
import { UnknownOptionError } from "../error";

class CLIEngine {
  isBundledElectronApp(): boolean {
    return process.versions && process.versions.electron && !(process as any).defaultApp
      ? true
      : false;
  }
  async start(rootCmd: CLICommand): Promise<void> {
    const root = cloneDeep(rootCmd);

    // 0. get user args
    const args = this.isBundledElectronApp() ? process.argv.slice(1) : process.argv.slice(2);
    // console.log(process.argv);

    // 1. find command
    const findRes = this.findCommand(rootCmd, args);
    const cmd = findRes.cmd;
    const remainingArgs = findRes.remainingArgs;

    // 2. parse args
    const context = this.parseArgs(cmd, root, remainingArgs);

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
    }

    try {
      // 6. version check
      const inputs = getSystemInputs(context.optionValues.projectPath as string);
      inputs.ignoreEnvInfo = true;
      const skipCommands = ["new", "sample", "upgrade"];
      if (!skipCommands.includes(context.command.name) && context.optionValues.projectPath) {
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
    const i = 0;
    let argumentIndex = 0;
    const context: CLIContext = {
      command: command,
      optionValues: {},
      globalOptionValues: {},
      argumentValues: [],
      telemetryProperties: {},
    };
    const options = (rootCommand.options || []).concat(command.options || []);

    const list = cloneDeep(args);
    while (list.length) {
      const arg = list.shift();
      if (!arg) continue;
      if (arg.startsWith("-") || arg.startsWith("--")) {
        const trimed = arg.startsWith("--") ? arg.substring(2) : arg.substring(1);
        let key: string;
        let value: string | undefined;
        if (trimed.includes("=")) {
          [key, value] = trimed.split("=");
          // console.log("found key=value expression", key, value);
          //process key, value
          list.unshift(value);
        } else {
          key = trimed;
        }
        const option = options.find((o) => o.name === key || o.shortName === key);
        // console.log("key: ", key, "option: ", option);
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
            // console.log("found array key, value: ", value);
            if (value) {
              if (option.value === undefined) {
                option.value = [];
              }
              const values = value.split(",");
              // console.log("found multiple values: ", values);
              for (const v of values) {
                option.value.push(v);
              }
            }
          }
          const inputValues = command.options?.includes(option)
            ? context.optionValues
            : context.globalOptionValues;
          const inputKey = option.questionName || option.name;
          if (option.value !== undefined) inputValues[inputKey] = option.value;
        } else {
          throw new UnknownOptionError(command.fullName!, key);
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
        if (option.required && option.default !== undefined && option.value === undefined) {
          option.value = option.default;
          context.optionValues[option.name] = option.default;
        }
      }
    }
    if (command.arguments) {
      for (let i = 0; i < command.arguments.length; ++i) {
        const argument = command.arguments[i];
        if (argument.required && argument.default !== undefined && argument.value === undefined) {
          argument.value = argument.default;
          context.argumentValues[i] = argument.default as string;
        }
      }
    }

    // special process for global options
    // process interactive
    context.globalOptionValues.interactive =
      context.globalOptionValues.interactive === false ? false : true;

    // set log level
    const logLevel = context.globalOptionValues.debug ? LogLevel.Debug : LogLevel.Info;
    logger.logLevel = logLevel;

    // set root folder
    const projectFolderOption = context.command.options?.find(
      (o) => o.questionName === "projectPath"
    );
    if (projectFolderOption) {
      // resolve project path
      const projectPath = path.resolve(projectFolderOption.value as string);
      projectFolderOption.value = projectPath;
      context.optionValues.projectPath = projectPath;
      if (projectPath) {
        CliTelemetry.withRootFolder(projectPath);
      }
    }

    UI.interactive = context.globalOptionValues.interactive as boolean;

    if (context.globalOptionValues.interactive) {
      const sameKeys = Object.keys(context.optionValues).filter(
        (k) => k !== "folder" && k in args && context.optionValues[k] !== undefined
      );
      if (sameKeys.length > 0) {
        /// only if there are intersects between parameters and arguments, show the log,
        /// because it means some parameters will be used by fx-core.
        logger.info(
          `Some arguments/options are useless because the interactive mode is opened.` +
            ` If you want to run the command non-interactively, add '--interactive false' after your command` +
            ` or set the global setting by 'teamsfx config set interactive false'.`
        );
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
