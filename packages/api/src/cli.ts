// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "./error";

export type OptionValue = string | boolean | string[] | boolean[] | undefined;

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

export interface CLIContext {
  command: CLICommand;
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
  shortName?: string;
  type: "text" | "boolean" | "singleSelect" | "multiSelect";
  required?: boolean;
  hidden?: boolean;
}

export interface CLIBooleanOption extends CLICommandOptionBase {
  type: "boolean";
  default?: boolean;
  value?: boolean;
}

export interface CLITextOption extends CLICommandOptionBase {
  type: "text";
  default?: string;
  value?: string;
}

export interface CLISingleSelectOption extends CLICommandOptionBase {
  type: "singleSelect";
  default?: string | boolean;
  choices?: string[] | boolean[];
  choiceListCommand?: string;
  value?: string | boolean;
}

export interface CLIMultiSelectOption extends CLICommandOptionBase {
  type: "multiSelect";
  default?: string[] | boolean[];
  choices?: string[] | boolean[];
  choiceListCommand?: string;
  value?: string[] | boolean[];
}

export type CLICommandOption =
  | CLIBooleanOption
  | CLITextOption
  | CLISingleSelectOption
  | CLIMultiSelectOption;

export type CLICommandArgument = CLICommandOption;

export interface CLIExample {
  command: string;
  description: string;
}
