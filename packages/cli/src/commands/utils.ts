// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chalk from "chalk";
import { Argument, Command, Option, Help, HelpConfiguration } from "commander";
import { CliArgument, CliCommand, CliOption, CliCommandWithContext } from "./models";
import { FooterText } from "../constants";
import { camelCase, capitalize } from "lodash";
import CliTelemetry from "../telemetry/cliTelemetry";
import { InputValidationError, MissingRequiredInputError } from "@microsoft/teamsfx-core";
import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import * as util from "util";
import { strings } from "../resource";

const help = new Help();
const displayRequiredProperty = true;
const requiredUseOneColumn = false;
const requireColumnText = "  [Required]";
const maxChoincesToDisplay = 3;

export function createCommand(model: CliCommand, forceParentCommand?: Command): Command {
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
      const subCommand = createCommand(cModel, forceParentCommand);
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

  if (displayRequiredProperty && model.options) {
    for (let i = 0; i < model.options.length; ++i) {
      const optionModel = model.options[i];
      if (optionModel.hidden) continue;
      const option = command.options[i];
      const namePart = optionName(optionModel, false);
      const requiredPart = optionModel.required ? requireColumnText : "";
      const flags = namePart + requiredPart.padStart(maxOptionLength - namePart.length);
      option.flags = flags;
    }
  }

  command.action(async (options) => {
    if (model.telemetry) {
      CliTelemetry.sendTelemetryEvent(model.telemetry.event + "-start");
    }

    // read global options
    const parent = getRootCommand(command);

    const globalOptions = parent.opts();

    const loglevel = globalOptions.debug ? "debug" : globalOptions.verbose ? "verbose" : "info";
    const interactive = globalOptions["I"] === "false" ? false : true;

    let res: Result<undefined, FxError>;

    //read option values
    const inputs: Record<string, any> = {};
    if (model.options) {
      for (const option of model.options) {
        const key = capitalize(camelCase(option.name));
        const abbr = option.shortName ? capitalize(camelCase(option.shortName)) : key;
        if (options[key] || options[abbr]) {
          option.value = options[key] || options[abbr];
          inputs[option.name] = option.value;
          if (!interactive) {
            res = validateOptionInputs(option);
            if (res.isErr()) {
              if (model.telemetry) {
                CliTelemetry.sendTelemetryErrorEvent(model.telemetry.event, res.error);
              }
              console.error(chalk.redBright(res.error.message));
              process.exit(1);
            }
          }
        }
      }
    }

    const context: CliCommandWithContext = {
      ...model,
      loglevel: loglevel,
      inputs: inputs,
      interactive: interactive,
      telemetryProperties: {},
    };

    res = await model.handler(context);
    if (res.isErr()) {
      if (model.telemetry) {
        CliTelemetry.sendTelemetryErrorEvent(model.telemetry.event, res.error);
      }
      console.error(chalk.redBright(res.error.message));
      process.exit(1);
    }
  });

  return command;
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
              option.choices.join(",")
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
  if (requiredUseOneColumn) {
    return help.padWidth(command, help) + requireColumnText.length;
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
  if (displayRequiredProperty && withRequiredColumn && option.required) flags += requireColumnText;
  return flags;
}

export function createArgument(model: CliArgument): Argument {
  const description = argumentDescription(model);
  const argument = new Argument(model.name);
  argument.description = description;
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
    extraInfo.push(`Default value: ${argument.default}.`);
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
    extraInfo.push(`Default value: ${option.default}.`);
  }

  let result = option.description;

  if (extraInfo.length > 0) {
    result += ` ${extraInfo.join(". ")}`;
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
  const maxLength = Math.min(choices.length, maxChoincesToDisplay);
  const list = choices.slice(0, maxLength);
  if (list.length < choices.length) list.push("etc.");
  return `Allowed value: [${list.join(", ")}].`;
}

export function compareOptions(a: Option, b: Option): number {
  const sortKey = (option: Option) => {
    return option.name().replace(/-/, "").toLowerCase();
  };
  return sortKey(a).localeCompare(sortKey(b));
}
