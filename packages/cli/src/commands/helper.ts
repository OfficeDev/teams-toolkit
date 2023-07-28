// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CliArgument, CliCommand, CliOption } from "./types";
import chalk from "chalk";

class Helper {
  itemIndentWidth = 2;
  itemSeparatorWidth = 2; // between term and description
  displayRequiredProperty = true;
  displayRequiredAsOneColumn = false;
  requiredColumnText = "  [Required]";
  maxChoicesToDisplay = 3;
  termWidth = 0;
  helpWidth = 120;

  formatOptionName(option: CliOption, withRequired = true) {
    let flags = `--${option.name}`;
    if (option.shortName) flags += ` -${option.shortName}`;
    if (
      this.displayRequiredProperty &&
      withRequired &&
      option.required &&
      option.default === undefined
    )
      flags += this.requiredColumnText;
    return flags;
  }
  formatArgumentName(argument: CliArgument) {
    if (argument.required) {
      return `<${argument.name}>`;
    } else {
      return `[${argument.name}]`;
    }
  }
  formatCommandName(command: CliCommand) {
    const args = command.arguments?.map((a) => this.formatArgumentName(a)).join(" ") || "";
    return `${command.name} ${command.options?.length ? "[options]" : ""} ${args}`.trim();
  }
  computePadWidth(command: CliCommand, rootCommand: CliCommand) {
    const names: string[] = [];

    command.options?.forEach((o) => {
      const name = this.formatOptionName(o);
      names.push(name);
    });

    command.arguments?.forEach((a) => {
      const name = this.formatArgumentName(a);
      names.push(name);
    });

    rootCommand.options?.forEach((o) => {
      const name = this.formatOptionName(o);
      names.push(name);
    });

    return Math.max(...names.map((n) => n.length));
  }
  wrap(str: string, width: number, indent: number, minColumnWidth = 40) {
    // Full \s characters, minus the linefeeds.
    const indents = " \\f\\t\\v\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff";
    // Detect manually wrapped and indented strings by searching for line break followed by spaces.
    const manualIndent = new RegExp(`[\\n][${indents}]+`);
    if (str.match(manualIndent)) return str;
    // Do not wrap if not enough room for a wrapped column of text (as could end up with a word per line).
    const columnWidth = width - indent;
    if (columnWidth < minColumnWidth) return str;

    const leadingStr = str.slice(0, indent);
    const columnText = str.slice(indent).replace("\r\n", "\n");
    const indentString = " ".repeat(indent);
    const zeroWidthSpace = "\u200B";
    const breaks = `\\s${zeroWidthSpace}`;
    // Match line end (so empty lines don't collapse),
    // or as much text as will fit in column, or excess text up to first break.
    const regex = new RegExp(
      `\n|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
      "g"
    );
    const lines = columnText.match(regex) || [];
    return (
      leadingStr +
      lines
        .map((line, i) => {
          if (line === "\n") return ""; // preserve empty lines
          return (i > 0 ? indentString : "") + line.trimEnd();
        })
        .join("\n")
    );
  }
  formatItem(term: string, description: string) {
    if (description) {
      const fullText = `${term.padEnd(this.termWidth + this.itemSeparatorWidth)}${description}`;
      return this.wrap(
        fullText,
        this.helpWidth - this.itemIndentWidth,
        this.termWidth + this.itemSeparatorWidth
      );
    }
    return term;
  }
  formatList(textArray: string[]) {
    return textArray.join("\n").replace(/^/gm, " ".repeat(this.itemIndentWidth));
  }

  formatCommandUsage(command: CliCommand) {
    return `Usage: ${this.formatCommandName(command)}`;
  }
  formatAllowedValue(choices: string[] | boolean[]) {
    const maxLength = Math.min(choices.length, this.maxChoicesToDisplay);
    const list = choices.slice(0, maxLength);
    return `Allowed value: [${list.map((i) => JSON.stringify(i)).join(", ")}${
      list.length < choices.length ? ", etc." : ""
    }].`;
  }
  formatArgumentDescription(argument: CliArgument) {
    const extraInfo = [];

    if (argument.type === "singleSelect" && argument.choices) {
      extraInfo.push(this.formatAllowedValue(argument.choices));
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
  formatOptionDescription(option: CliOption) {
    const extraInfo = [];

    if ((option.type === "multiSelect" || option.type === "singleSelect") && option.choices) {
      extraInfo.push(this.formatAllowedValue(option.choices));
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
      result += ` Use '${chalk.blueBright(
        option.choiceListCommand
      )}' to see all available options.`;
    }
    return result;
  }
  formatHelp(command: CliCommand, rootCommand: CliCommand): string {
    this.termWidth = this.computePadWidth(command, rootCommand);

    let output: string[] = [];

    // Header
    if (rootCommand.header) {
      output = output.concat([rootCommand.header, ""]);
    }

    // Usage
    output = output.concat([this.formatCommandUsage(command), ""]);

    // Description
    const commandDescription = command.description;
    if (commandDescription.length > 0) {
      output = output.concat([helper.wrap(commandDescription, this.helpWidth, 0), ""]);
    }

    // Arguments
    const argumentList = (command.arguments || []).map((argument) => {
      return this.formatItem(argument.name, this.formatArgumentDescription(argument));
    });
    if (argumentList.length > 0) {
      output = output.concat(["Arguments:", this.formatList(argumentList), ""]);
    }

    // Options
    const optionList = (command.options || []).sort(compareOptions).map((option) => {
      return this.formatItem(
        this.formatOptionName(option, true),
        this.formatOptionDescription(option)
      );
    });
    if (optionList.length > 0) {
      output = output.concat(["Options:", this.formatList(optionList), ""]);
    }

    const globalOptionList = (rootCommand.options || []).sort(compareOptions).map((option) => {
      return this.formatItem(
        this.formatOptionName(option, true),
        this.formatOptionDescription(option)
      );
    });
    if (globalOptionList.length > 0) {
      output = output.concat(["Global Options:", this.formatList(globalOptionList), ""]);
    }

    // SubCommands
    const commandList = (command.commands || []).map((cmd) => {
      return this.formatItem(this.formatCommandName(cmd), cmd.description);
    });
    if (commandList.length > 0) {
      output = output.concat(["Commands:", this.formatList(commandList), ""]);
    }

    // Examples
    if (command.examples) {
      output = output.concat(["Examples:", ...command.examples.map((e) => "  " + e)]);
    }

    // Footer
    if (rootCommand.footer) {
      output.push(rootCommand.footer);
    }

    return output.join("\n");
  }
}

export const helper = new Helper();

export function compareOptions(a: CliOption, b: CliOption): number {
  const sortKey = (option: CliOption) => {
    return option.name.replace(/-/g, "").toLowerCase();
  };
  return sortKey(a).localeCompare(sortKey(b));
}
