// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result } from "@microsoft/teamsfx-api";

export type OptionValue = string | boolean | string[] | boolean[];

export interface CLICommand {
  name: string;
  fullName?: string;
  version?: string;
  description: string;
  arguments?: CLICommandArgument[];
  options?: CLICommandOption[];
  examples?: string[];
  commands?: CLICommand[];
  handler: (cmd: CLIContext) => Promise<Result<undefined, FxError>>;
  telemetry?: {
    event: string;
  };
  header?: string;
  footer?: string;
}

export interface CLIContext {
  command: CLICommand;
  optionValues: Record<string, OptionValue>;
  globalOptionValues: Record<string, OptionValue>;
  argumentValues: string[];
  telemetryProperties: Record<string, string>;
}

interface CLICommandOptionBase {
  name: string;
  description: string;
  shortName?: string;
  type: "text" | "boolean" | "singleSelect" | "multiSelect";
  required?: boolean;
  hidden?: boolean;
}

interface CLIBooleanOption extends CLICommandOptionBase {
  type: "boolean";
  default?: boolean;
  value?: boolean;
}

interface CLITextOption extends CLICommandOptionBase {
  type: "text";
  default?: string;
  value?: string;
}

interface CLISingleSelectOption extends CLICommandOptionBase {
  type: "singleSelect";
  default?: string | boolean;
  choices?: string[] | boolean[];
  choiceListCommand?: string;
  value?: string | boolean;
}

interface CLIMultiSelectOption extends CLICommandOptionBase {
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

export type CLICommandArgument = CLITextOption | CLISingleSelectOption;
