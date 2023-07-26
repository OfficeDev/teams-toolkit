// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chalk from "chalk";
import { Argument, Command, Option, Help } from "commander";
import { CliArgument, CliCommand, CliOption, CliParsedCommand } from "./models";
import { FooterText } from "../constants";
import { camelCase, capitalize } from "lodash";

const help = new Help();
const enableRequiredColumn = true;
const requireColumnText = "  [Required]";

export function createCommand(model: CliCommand): Command {
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
  command.configureHelp({ showGlobalOptions: true });
  command.helpOption("--help -h", "Show help");

  const afterTexts: string[] = [];
  if (model.examples) {
    afterTexts.push("\nExamples:");
    for (const example of model.examples) {
      afterTexts.push("  " + example);
    }
  }
  afterTexts.push(FooterText);
  command.addHelpText("after", afterTexts.join("\n"));

  const maxOptionLength = help.padWidth(command, help) + requireColumnText.length;
  if (enableRequiredColumn && model.options) {
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
    // console.log("options returned by commander: ", options);

    // read global options
    const parent = getRootCommand(command);

    const globalOptions = parent.opts();

    const loglevel = globalOptions.debug ? "debug" : globalOptions.verbose ? "verbose" : "info";
    const interactive = globalOptions["I"] === "false" ? false : true;

    //read option values
    const inputs: Record<string, any> = {};
    if (model.options) {
      for (const option of model.options) {
        const key = capitalize(camelCase(option.name));
        const abbr = option.shortName ? capitalize(camelCase(option.shortName)) : key;
        // console.log(`key=${key}, abbreviation=${abbr}`);
        if (options[key] || options[abbr]) {
          option.value = options[key] || options[abbr];
          inputs[option.name] = option.value;
        }
      }
    }

    const parsedCommand: CliParsedCommand = {
      ...model,
      loglevel: loglevel,
      inputs: inputs,
      interactive: interactive,
    };

    const res = await model.handler(parsedCommand);
    if (res.isErr()) {
      console.error(chalk.redBright(res.error.message));
      process.exit(1);
    }
  });

  return command;
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
  if (enableRequiredColumn && withRequiredColumn && option.required) flags += requireColumnText;
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
    extraInfo.push(`Allowed value: [${argument.choices.join(", ")}].`);
  }
  if (argument.default !== undefined) {
    extraInfo.push(`Default value: ${argument.default}.`);
  }

  let result = argument.description;

  if (extraInfo.length > 0) {
    result += ` (${extraInfo.join(" ")})`;
  }
  if (argument.type === "singleSelect" && argument.choiceListCommand) {
    result += `, Use '${chalk.blueBright(
      argument.choiceListCommand
    )}' to see all available options`;
  }
  return result;
}

function optionDescription(option: CliOption) {
  const extraInfo = [];

  if ((option.type === "multiSelect" || option.type === "singleSelect") && option.choices) {
    extraInfo.push(`Allowed value: [${option.choices.join(", ")}]`);
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
