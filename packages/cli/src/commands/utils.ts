// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chalk from "chalk";
import { Argument, Command, Option } from "commander";
import { CliArgument, CliCommand, CliOption } from "./models";
import { FooterText } from "../constants";

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
  command.helpOption("--help, -h", "Show help");

  const afterTexts: string[] = [];
  if (model.examples) {
    afterTexts.push("\nExamples:");
    for (const example of model.examples) {
      afterTexts.push("  " + example);
    }
  }
  afterTexts.push(FooterText);
  command.addHelpText("after", afterTexts.join("\n"));
  return command;
}

export function createArgument(model: CliArgument): Argument {
  const description = argumentDescription(model);
  const argument = new Argument(model.name);
  argument.description = description;
  if (model.default) argument.default(model.default);
  if (model.type === "singleSelect") {
    if (model.choices) {
      argument.choices(model.choices);
    }
  }
  return argument;
}

export function createOption(model: CliOption): Option {
  const description = optionDescription(model);
  let flags = `--${model.name}`;
  if (model.shortName) flags += `, -${model.shortName}`;
  const option = new Option(flags, description);
  if (model.type !== "boolean") {
    option.required = true;
  }
  if (model.type === "multiSelect") {
    option.variadic = true;
  }
  if (model.required) {
    option.mandatory = true;
  }
  if (model.default) option.default(model.default);
  return option;
}

function argumentDescription(argument: CliArgument) {
  const extraInfo = [];

  if (argument.type === "singleSelect" && argument.choices) {
    extraInfo.push(`choices: ${argument.choices.map((choice) => `"${choice}"`).join(", ")}`);
  }
  if (argument.default !== undefined) {
    extraInfo.push(`default: ${JSON.stringify(argument.default)}`);
  }

  let result = argument.description;

  if (extraInfo.length > 0) {
    result += ` (${extraInfo.join(" ")})`;
  }
  if (argument.type === "singleSelect" && argument.choiceListCommand) {
    result += `, Use '${chalk.blueBright(argument.choiceListCommand)}' for available choices`;
  }
  return result;
}

function optionDescription(option: CliOption) {
  const extraInfo = [];

  if ((option.type === "multiSelect" || option.type === "singleSelect") && option.choices) {
    extraInfo.push(`choices: ${option.choices.map((choice) => `"${choice}"`).join(", ")}`);
  }
  if (option.default !== undefined) {
    extraInfo.push(`default: ${JSON.stringify(option.default)}`);
  }

  let result = option.description;

  if (extraInfo.length > 0) {
    result += ` (${extraInfo.join(" ")})`;
  }
  if (
    (option.type === "multiSelect" || option.type === "singleSelect") &&
    option.choiceListCommand
  ) {
    result += `, Use '${chalk.blueBright(option.choiceListCommand)}' for available choices.`;
  }
  return result;
}
