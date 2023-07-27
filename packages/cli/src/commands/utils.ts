// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import {
  assembleError,
  InputValidationError,
  MissingRequiredInputError,
} from "@microsoft/teamsfx-core";
import chalk from "chalk";
import { Argument, Command, Help, HelpConfiguration, Option } from "commander";
import { camelCase, capitalize, cloneDeep } from "lodash";
import * as util from "util";
import { colorize, TextType } from "../colorize";
import CLILogProvider from "../commonlib/log";
import { FooterText } from "../constants";
import { strings } from "../resource";
import CliTelemetry from "../telemetry/cliTelemetry";
import UI from "../userInteraction";
import { CliArgument, CliCommand, CliCommandWithContext, CliOption } from "./models";

const help = new Help();
const DisplayRequiredProperty = true;
const DisplayRequiredAsOneColumn = false;
const RequiredColumnText = "  [Required]";
const MaxChoicesToDisplay = 3;

export function createCommand(
  model: CliCommand,
  prefix: string,
  forceParentCommand?: Command
): Command {
  model.fullName = prefix + " " + model.name;
  const command = new Command(model.name);
  command.description(model.description);
  if (model.arguments) {
    for (const aModel of model.arguments) {
      command.addArgument(createArgument(aModel));
    }
  }

  if (model.options) {
    for (const oModel of model.options) {
      command.addOption(createOption(oModel));
    }
  }

  if (model.commands) {
    for (const cModel of model.commands) {
      const subCommand = createCommand(cModel, model.fullName, forceParentCommand);
      command.addCommand(subCommand);
    }
  }
  const helpConfig: HelpConfiguration = {
    showGlobalOptions: true,
    sortOptions: true,
    sortSubcommands: true,
    visibleOptions: (cmd) => {
      let res = cmd.options.filter((option) => !option.hidden);
      res = res.sort(compareOptions);
      return res;
    },
  };
  if (forceParentCommand) {
    helpConfig.visibleGlobalOptions = (cmd) => {
      let res = forceParentCommand.options.filter((option) => !option.hidden);
      res.push(cmd.createOption("--help -h", "Show help message."));
      res = res.sort(compareOptions);
      return res;
    };
  }
  command.configureHelp(helpConfig);

  const afterTexts: string[] = [];
  if (model.examples) {
    afterTexts.push("\nExamples:");
    for (const example of model.examples) {
      afterTexts.push("  " + example);
    }
  }
  afterTexts.push(FooterText);
  command.addHelpText("after", afterTexts.join("\n"));

  const maxOptionLength = computePadWidth(model, command);

  if (DisplayRequiredProperty && model.options) {
    for (let i = 0; i < model.options.length; ++i) {
      const optionModel = model.options[i];
      if (optionModel.hidden) continue;
      const option = command.options[i];
      const namePart = optionName(optionModel, false);
      const requiredPart =
        optionModel.required && optionModel.default === undefined ? RequiredColumnText : "";
      const flags = namePart + requiredPart.padStart(maxOptionLength - namePart.length);
      option.flags = flags;
    }
  }

  command.action(async (options) => {
    if (model.telemetry) {
      CliTelemetry.sendTelemetryEvent(model.telemetry.event + "-start");
    }
    console.log(`options: ${JSON.stringify(command.opts())}`);
    console.log(`args: ${command.args}`);
    //read global options and build context
    const parent = getRootCommand(command);
    const globalOptions = parent.opts();
    const logLevel = globalOptions.debug ? "debug" : globalOptions.verbose ? "verbose" : "info";
    const interactive = globalOptions["I"] === "false" ? false : true;
    UI.interactive = interactive;
    const context: CliCommandWithContext = {
      ...cloneDeep(model),
      logLevel: logLevel,
      inputs: {},
      interactive: interactive,
      telemetryProperties: {},
    };

    //read and validate option values
    const readRes = readAndValidateOptionValues(model, options, interactive);
    if (readRes.isErr()) {
      processResult(context, readRes.error);
      return;
    }

    try {
      context.inputs = readRes.value;
      const handleRes = await model.handler(context);
      if (handleRes.isErr()) {
        processResult(context, handleRes.error);
      } else {
        processResult(context);
      }
    } catch (e) {
      const fxError = assembleError(e);
      processResult(context, fxError);
    }
    process.exit(0);
  });

  return command;
}

function readAndValidateOptionValues(
  model: CliCommand,
  options: any,
  interactive: boolean
): Result<Record<string, any>, InputValidationError | MissingRequiredInputError> {
  const inputs: Record<string, any> = {};
  if (model.options) {
    for (const option of model.options) {
      const key = capitalize(camelCase(option.name));
      const abbr = option.shortName ? capitalize(camelCase(option.shortName)) : key;
      if (options[key] || options[abbr]) {
        option.value = options[key] || options[abbr];
        inputs[option.name] = option.value;
        if (!interactive) {
          const res = validateOptionInputs(option);
          if (res.isErr()) {
            return err(res.error);
          }
        }
      } else {
        if (option.required && option.default) {
          // set default value for required option
          inputs[option.name] = option.default;
        }
      }
    }
  }
  return ok(inputs);
}

function processResult(context: CliCommandWithContext, fxError?: FxError): void {
  if (context.telemetry) {
    if (fxError) {
      CliTelemetry.sendTelemetryErrorEvent(
        context.telemetry.event,
        fxError,
        context.telemetryProperties
      );
    } else {
      CliTelemetry.sendTelemetryEvent(context.telemetry.event, context.telemetryProperties);
    }
  }
  if (fxError) {
    CLILogProvider.outputError(`${fxError.source}.${fxError.name}: ${fxError.message}`);
    if ("helpLink" in fxError && fxError["helpLink"]) {
      CLILogProvider.outputError(
        `Get help from `,
        colorize(fxError["helpLink"], TextType.Hyperlink)
      );
    }
    if ("issueLink" in fxError && fxError["issueLink"]) {
      CLILogProvider.outputError(
        `Report this issue at `,
        colorize(fxError["issueLink"], TextType.Hyperlink)
      );
    }
  }
}

/**
 * validate option values
 */
function validateOptionInputs(
  option: CliOption
): Result<undefined, InputValidationError | MissingRequiredInputError> {
  if (option.required && option.value === undefined) {
    return err(new MissingRequiredInputError(optionName(option, false)));
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
            optionName(option, false),
            util.format(
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
              optionName(option, false),
              util.format(
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

function computePadWidth(model: CliCommand, command: Command) {
  if (DisplayRequiredAsOneColumn) {
    return help.padWidth(command, help) + RequiredColumnText.length;
  } else {
    const optionNames = model.options?.map((o) => optionName(o, true)) ?? [];
    optionNames.push("--interactive -i");
    return Math.max(...optionNames.map((n) => n.length));
  }
}

function getRootCommand(command: Command): Command {
  let p = command;
  while (p.parent) {
    p = p.parent;
  }
  return p;
}

function optionName(option: CliOption, withRequiredColumn = true) {
  let flags = `--${option.name}`;
  if (option.shortName) flags += ` -${option.shortName}`;
  if (
    DisplayRequiredProperty &&
    withRequiredColumn &&
    option.required &&
    option.default === undefined
  )
    flags += RequiredColumnText;
  return flags;
}

export function createArgument(model: CliArgument): Argument {
  const description = argumentDescription(model);
  const argument = new Argument("<" + model.name + ">", description);
  return argument;
}

export function createOption(model: CliOption): Option {
  const description = optionDescription(model);
  const flags = optionName(model);
  const option = new Option(flags, description);
  option.required = true;
  if (model.type === "multiSelect") {
    option.variadic = true;
  }
  option.hidden = model.hidden === true;
  return option;
}

function argumentDescription(argument: CliArgument) {
  const extraInfo = [];

  if (argument.type === "singleSelect" && argument.choices) {
    extraInfo.push(formatAllowedValue(argument.choices));
  }
  if (argument.default !== undefined) {
    extraInfo.push(`Default value: ${JSON.stringify(argument.default)}.`);
  }

  let result = argument.description;

  if (extraInfo.length > 0) {
    result += ` ${extraInfo.join(". ")}`;
  }
  if (argument.type === "singleSelect" && argument.choiceListCommand) {
    result += ` Use '${chalk.blueBright(
      argument.choiceListCommand
    )}' to see all available options.`;
  }
  return result;
}

function optionDescription(option: CliOption) {
  const extraInfo = [];

  if ((option.type === "multiSelect" || option.type === "singleSelect") && option.choices) {
    extraInfo.push(formatAllowedValue(option.choices));
  }
  if (option.default !== undefined) {
    extraInfo.push(`Default value: ${JSON.stringify(option.default)}.`);
  }

  let result = option.description;

  if (extraInfo.length > 0) {
    result += ` ${extraInfo.join(" ")}`;
  }
  if (
    (option.type === "multiSelect" || option.type === "singleSelect") &&
    option.choiceListCommand
  ) {
    result += ` Use '${chalk.blueBright(option.choiceListCommand)}' to see all available options.`;
  }
  return result;
}

function formatAllowedValue(choices: any[]) {
  const maxLength = Math.min(choices.length, MaxChoicesToDisplay);
  const list = choices.slice(0, maxLength);
  if (list.length < choices.length) list.push("etc.");
  return `Allowed value: [${list.map((i) => JSON.stringify(i)).join(", ")}].`;
}

export function compareOptions(a: Option, b: Option): number {
  const sortKey = (option: Option) => {
    return option.name().replace(/-/, "").toLowerCase();
  };
  return sortKey(a).localeCompare(sortKey(b));
}
