// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "./error";

export type OptionValue = string | boolean | string[] | undefined;
export type CLIOptionType = "boolean" | "string" | "array";

export interface CLICommand {
  name: string;
  fullName?: string;
  version?: string;
  description: string;
  arguments?: CLICommandArgument[];
  sortOptions?: boolean;
  sortCommands?: boolean;
  options?: CLICommandOption[];
  examples?: CLIExample[];
  commands?: CLICommand[];
  handler?: (cmd: CLIContext) => Promise<Result<undefined, FxError>>;
  telemetry?: {
    event: string;
  };
  header?: string;
  footer?: string;
  hidden?: boolean;
}

export interface CLIFoundCommand extends CLICommand {
  fullName: string;
}

export interface CLIContext {
  command: CLIFoundCommand;
  optionValues: Record<string, OptionValue>;
  globalOptionValues: Record<string, OptionValue>;
  argumentValues: string[];
  telemetryProperties: Record<string, string>;
}

interface CLICommandOptionBase {
  /** @description option/argument name used in CLI */
  name: string;
  /** @description question name used in FxCore */
  questionName?: string;
  description: string;
  /** @description option/argument abbreviation */
  shortName?: string;
  type: CLIOptionType;
  required?: boolean;
  hidden?: boolean;
}

export interface CLIBooleanOption extends CLICommandOptionBase {
  type: "boolean";
  default?: boolean;
  value?: boolean;
}

export interface CLIStringOption extends CLICommandOptionBase {
  type: "string";
  default?: string;
  value?: string;
  choices?: string[];
  /** @description whether to skip validation against allowed values defined in choices */
  skipValidation?: boolean;
  choiceListCommand?: string;
}

export interface CLIArrayOption extends CLICommandOptionBase {
  type: "array";
  default?: string[];
  choices?: string[];
  /** @description whether to skip validation against allowed values defined in choices */
  skipValidation?: boolean;
  choiceListCommand?: string;
  value?: string[];
}

export type CLICommandOption = CLIBooleanOption | CLIStringOption | CLIArrayOption;

export type CLICommandArgument = CLICommandOption;

export interface CLIExample {
  command: string;
  description: string;
}
