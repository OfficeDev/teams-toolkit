// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandArgument, CLICommand, CLICommandOption } from "./types";

class Helper {
  itemIndentWidth = 2;
  itemSeparatorWidth = 2; // between term and description
  displayRequiredProperty = true;
  displayRequiredAsOneColumn = false;
  requiredColumnText = "  [Required]";
  maxChoicesToDisplay = 3;
  termWidth = 0;
  helpWidth = process.stdout.isTTY ? process.stdout.columns : 80;

  formatOptionName(option: CLICommandOption, withRequired = true) {
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
  formatArgumentName(argument: CLICommandArgument) {
    if (argument.required) {
      return `<${argument.name}>`;
    } else {
      return `[${argument.name}]`;
    }
  }
  formatCommandName(command: CLICommand) {
    const args = command.arguments?.map((a) => this.formatArgumentName(a)).join(" ") || "";
    return `${command.name} ${command.options?.length ? "[options]" : ""} ${args}`.trim();
  }
  computePadWidth(command: CLICommand, rootCommand: CLICommand) {
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
    const indentChars = " \\f\\t\\v\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff";
    const manualIndentRegex = new RegExp(`[\\n][${indentChars}]+`);
    if (str.match(manualIndentRegex)) return str;
    const columnWidth = width - indent;
    if (columnWidth < minColumnWidth) return str;
    const header = str.slice(0, indent);
    const columnText = str.slice(indent).replace("\r\n", "\n");
    const indentString = " ".repeat(indent);
    const zeroWidthSpace = "\u200B";
    const breaks = `\\s${zeroWidthSpace}`;
    const regex = new RegExp(
      `\n|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
      "g"
    );
    const lines = columnText.match(regex) || [];
    return (
      header +
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

  formatCommandUsage(command: CLICommand) {
    return `Usage: ${this.formatCommandName(command)}`;
  }
  formatAllowedValue(choices: string[] | boolean[]) {
    const maxLength = Math.min(choices.length, this.maxChoicesToDisplay);
    const list = choices.slice(0, maxLength);
    return `Allowed value: [${list.map((i) => JSON.stringify(i)).join(", ")}${
      list.length < choices.length ? ", etc." : ""
    }].`;
  }
  formatArgumentDescription(argument: CLICommandArgument) {
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
      result += ` Use '${argument.choiceListCommand}' to see all available options.`;
    }
    return result;
  }
  formatOptionDescription(option: CLICommandOption) {
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
      result += ` Use '${option.choiceListCommand}' to see all available options.`;
    }
    return result;
  }
  formatHelp(command: CLICommand, rootCommand: CLICommand): string {
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

export function compareOptions(a: CLICommandOption, b: CLICommandOption): number {
  const sortKey = (option: CLICommandOption) => {
    return option.name.replace(/-/g, "").toLowerCase();
  };
  return sortKey(a).localeCompare(sortKey(b));
}
