// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "./error";

export type OptionValue = string | boolean | string[] | undefined;
export type CLIOptionType = "boolean" | "string" | "array";

export interface CLICommand {
  /**
   * @description command name, only meaningful to its parent command, like "sample"
   */
  name: string;
  /**
   * @description command full name, like "teamsfx new sample", only available after command finding
   */
  fullName?: string;
  /**
   * @description CLI version, only necessary for the root command
   */
  version?: string;
  /**
   * @description command description
   */
  description: string;
  /**
   * @description command argument, for example, "teamsfx new sample <sample-name>": sample-name is an argument, which is positional
   */
  arguments?: CLICommandArgument[];

  /**
   * @description command options, followed by "--" or "-" char, for example, "teamsfx new sample --option1 value1 --option2 value2"
   */
  options?: CLICommandOption[];

  /**
   * @description whether to sort options in "--help"
   */
  sortOptions?: boolean;

  /**
   * @description sub commands, CLI commands are organized in a tree structure, commands can have sub commands
   */
  commands?: CLICommand[];

  /**
   * @description whether to sort sub commands in "--help"
   */
  sortCommands?: boolean;

  /**
   * @description examples of how to use this command
   */
  examples?: CLIExample[];

  /**
   * @description command handler
   */
  handler?: (ctx: CLIContext) => Promise<Result<undefined, FxError>> | Result<undefined, FxError>;

  /**
   * @description telemetry will be sent when available
   */
  telemetry?: {
    event: string;
  };

  /**
   * @description header message will be printed on the top in "--help"
   */
  header?: string;
  /**
   * @description footer message will be printed on the bottom in "--help"
   */
  footer?: string;
  /**
   * @description whether to hide this command in "--help"
   */
  hidden?: boolean;

  /**
   * @description default value of global option "--interactive", default value is true
   */
  defaultInteractiveOption?: boolean;

  /**
   * @description reserve option values in interactive mode
   */
  reservedOptionNamesInInteractiveMode?: string[];
}

export interface CLIFoundCommand extends CLICommand {
  fullName: string;
}

export interface CLIContext {
  /**
   * @description the command matched
   */
  command: CLIFoundCommand;
  /**
   * @description parsed option values
   */
  optionValues: Record<string, OptionValue>;
  /**
   * @description parsed global option values, global options are options defined by the root command in the command tree.
   */
  globalOptionValues: Record<string, OptionValue>;
  /**
   * @description parsed argument values
   */
  argumentValues: OptionValue[];
  /**
   * @description telemetry properties, which cen be accessed in the process of command execution lifecycle
   */
  telemetryProperties: Record<string, string>;
}

interface CLICommandOptionBase {
  /**
   * @description option/argument name
   * */
  name: string;
  /**
   * @description when converting option key-value into @Inputs for FxCore,
   * the key will be used as the property name if defined, otherwise the name will be used
   */
  questionName?: string;
  /**
   * @description option/argument description
   */
  description: string;
  /**
   * @description option/argument abbreviation
   */
  shortName?: string;
  /**
   * @description option/argument value type: boolean, text, array
   */
  type: CLIOptionType;
  /**
   * @description whether this option/argument is required
   */
  required?: boolean;
  /**
   * @description whether this option/argument is hidden in "--help"
   */
  hidden?: boolean;
}

export interface CLIBooleanOption extends CLICommandOptionBase {
  type: "boolean";
  /**
   * @description default value
   */
  default?: boolean;
  /**
   * @description parsed input value
   */
  value?: boolean;
}

export interface CLIStringOption extends CLICommandOptionBase {
  type: "string";
  /**
   * @description default value
   */
  default?: string;
  /**
   * @description parsed input value
   */
  value?: string;
  /**
   * allowed values
   */
  choices?: string[];
  /**
   * @description whether to skip validation against allowed values defined in choices
   */
  skipValidation?: boolean;
  /**
   * @description command to get choice list
   */
  choiceListCommand?: string;
}

export interface CLIArrayOption extends CLICommandOptionBase {
  type: "array";
  /**
   * @description default value
   */
  default?: string[];
  /**
   * @description parsed input value
   */
  value?: string[];
  /**
   * allowed values
   */
  choices?: string[];
  /**
   * @description whether to skip validation against allowed values defined in choices
   */
  skipValidation?: boolean;
  /**
   * @description command to get choice list
   */
  choiceListCommand?: string;
}

export type CLICommandOption = CLIBooleanOption | CLIStringOption | CLIArrayOption;

export type CLICommandArgument = CLICommandOption;

export interface CLIExample {
  /**
   * @description example command
   */
  command: string;
  /**
   * @description description of the sample command
   */
  description: string;
}
