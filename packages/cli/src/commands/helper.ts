// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandArgument, CLICommand, CLICommandOption, CLIExample } from "./types";
import chalk from "chalk";

class Helper {
  itemIndentWidth = 2;
  itemSeparatorWidth = 2; // between term and description
  displayRequired = true;
  requiredColumnText = "  [Required]";
  maxChoicesToDisplay = 3;
  termWidth = 0;
  helpWidth = process.stdout.isTTY ? process.stdout.columns : 80;

  formatOptionName(option: CLICommandOption, withRequired = true, insertIndent = false) {
    let flags = `--${option.name}`;
    if (option.shortName) flags += ` -${option.shortName}`;
    if (this.displayRequired && withRequired && option.required && option.default === undefined) {
      if (insertIndent)
        flags += " ".repeat(this.termWidth - flags.length - this.requiredColumnText.length);
      flags += this.requiredColumnText;
    }
    return flags;
  }
  formatArgumentName(argument: CLICommandArgument) {
    if (argument.required) {
      return `<${argument.name}>`;
    } else {
      return `[${argument.name}]`;
    }
  }
  formatSubCommandName(command: CLICommand) {
    const args = command.arguments?.map((a) => this.formatArgumentName(a)).join(" ") || "";
    return `${command.name}${command.options?.length ? " [options]" : ""} ${args}`.trim();
  }
  formatExample(example: CLIExample) {
    return `  '${chalk.blueBright(example.command)}': ${example.description}`;
  }
  formatCommandName(command: CLICommand) {
    const args = command.arguments?.map((a) => this.formatArgumentName(a)).join(" ") || "";
    return `${command.fullName || command.name} ${
      command.options?.length ? "[options]" : ""
    } ${args}`.trim();
  }
  computePadWidth(command: CLICommand, rootCommand?: CLICommand) {
    const names: string[] = [];

    command.options?.forEach((o) => {
      const name = this.formatOptionName(o);
      names.push(name);
    });

    command.arguments?.forEach((a) => {
      const name = this.formatArgumentName(a);
      names.push(name);
    });

    rootCommand?.options?.forEach((o) => {
      const name = this.formatOptionName(o);
      names.push(name);
    });

    command.commands?.forEach((c) => {
      const name = this.formatSubCommandName(c);
      names.push(name);
    });

    return Math.max(...names.map((n) => n.length));
  }
  prettifyReturnLine(text: string, width: number, indent: number, minWidth = 40) {
    const indentChars = " \\f\\t\\v\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff";
    const manualIndentRegex = new RegExp(`[\\n][${indentChars}]+`);
    if (text.match(manualIndentRegex)) return text;
    const cwidth = width - indent;
    if (cwidth < minWidth) return text;
    const header = text.slice(0, indent);
    const ctext = text.slice(indent).replace("\r\n", "\n");
    const breaks = "\\s\u200B";
    const regex = new RegExp(
      `\n|.{1,${cwidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
      "g"
    );
    const lines = ctext.match(regex) || [];
    const res =
      header +
      lines
        .map((line, i) => {
          if (line === "\n") return "";
          return (i > 0 ? " ".repeat(indent) : "") + line.trimEnd();
        })
        .join("\n");
    return res;
  }
  formatItem(term: string, description: string) {
    if (description) {
      const fullText = `${term.padEnd(this.termWidth + this.itemSeparatorWidth)}${description}`;
      const res = this.prettifyReturnLine(
        fullText,
        this.helpWidth - this.itemIndentWidth,
        this.termWidth + this.itemSeparatorWidth
      );
      return res;
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
    const sentances = [argument.description];
    if (argument.type === "singleSelect" && argument.choices) {
      sentances.push(this.formatAllowedValue(argument.choices));
    }
    if (argument.default !== undefined) {
      sentances.push(`Default value: ${JSON.stringify(argument.default)}.`);
    }
    if (argument.type === "singleSelect" && argument.choiceListCommand) {
      sentances.push(`Use '${argument.choiceListCommand}' to see all available options.`);
    }
    return sentances.join(" ");
  }
  formatOptionDescription(option: CLICommandOption) {
    const sentances = [option.description];
    if ((option.type === "multiSelect" || option.type === "singleSelect") && option.choices) {
      sentances.push(this.formatAllowedValue(option.choices));
    }
    if (option.default !== undefined) {
      sentances.push(`Default value: ${JSON.stringify(option.default)}.`);
    }
    if (
      (option.type === "multiSelect" || option.type === "singleSelect") &&
      option.choiceListCommand
    ) {
      sentances.push(`Use '${option.choiceListCommand}' to see all available options.`);
    }
    return sentances.join(" ");
  }
  formatHelp(command: CLICommand, rootCommand?: CLICommand): string {
    this.termWidth = this.computePadWidth(command, rootCommand);

    let output: string[] = [];

    // Header
    if (rootCommand?.header) {
      output = output.concat([rootCommand.header, ""]);
    }

    // Usage
    output = output.concat([this.formatCommandUsage(command), ""]);

    // Description
    const commandDescription = command.description;
    if (commandDescription.length > 0) {
      output = output.concat([
        helper.prettifyReturnLine(commandDescription, this.helpWidth, 0),
        "",
      ]);
    }

    // Arguments
    const argumentList = (command.arguments || []).map((argument) => {
      return this.formatItem(argument.name, this.formatArgumentDescription(argument));
    });
    if (argumentList.length > 0) {
      output = output.concat(["Arguments:", this.formatList(argumentList), ""]);
    }

    // Options
    let options = command.options || [];
    if (command.sortOptions) options = options.sort(compareOptions);
    const optionList = options.map((option) => {
      return this.formatItem(
        this.formatOptionName(option, true, true),
        this.formatOptionDescription(option)
      );
    });
    if (optionList.length > 0) {
      output = output.concat(["Options:", this.formatList(optionList), ""]);
    }

    // Global Options
    let globalOptions = rootCommand?.options || [];
    if (rootCommand?.sortOptions) globalOptions = globalOptions.sort(compareOptions);
    const globalOptionList = globalOptions.map((option) => {
      return this.formatItem(
        this.formatOptionName(option, true, true),
        this.formatOptionDescription(option)
      );
    });
    if (globalOptionList.length > 0) {
      output = output.concat(["Global Options:", this.formatList(globalOptionList), ""]);
    }

    // SubCommands
    let subCommands = (command.commands || []).filter((c) => !c.hidden);
    if (command.sortCommands) subCommands = subCommands.sort(compareCommands);
    const commandList = subCommands.map((cmd) => {
      return this.formatItem(this.formatSubCommandName(cmd), cmd.description);
    });
    if (commandList.length > 0) {
      output = output.concat(["Commands:", this.formatList(commandList), ""]);
    }

    // Examples
    if (command.examples) {
      output = output.concat(["Examples:", ...command.examples.map((e) => this.formatExample(e))]);
    }

    // Footer
    if (rootCommand?.footer) {
      output.push("");
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

export function compareCommands(a: CLICommand, b: CLICommand): number {
  const sortKey = (option: CLICommand) => {
    return option.name.replace(/-/g, "").toLowerCase();
  };
  return sortKey(a).localeCompare(sortKey(b));
}
