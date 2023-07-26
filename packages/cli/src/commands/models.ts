// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result } from "@microsoft/teamsfx-api";

export interface CliCommand {
  name: string;
  description: string;
  arguments?: CliArgument[];
  options?: CliOption[];
  examples?: string[];
  commands?: CliCommand[];
  handler: (cmd: CliParsedCommand) => Promise<Result<undefined, FxError>>;
}

export interface CliParsedCommand extends CliCommand {
  inputs: Record<string, any>;
  loglevel: "verbose" | "debug" | "info";
  interactive: boolean;
}

interface CliOptionBase {
  name: string;
  description: string;
  shortName?: string;
  type: "text" | "boolean" | "singleSelect" | "multiSelect";
  required?: boolean;
  hidden?: boolean;
}

interface CliBooleanOption extends CliOptionBase {
  type: "boolean";
  default?: boolean;
  value?: boolean;
}

interface CliTextOption extends CliOptionBase {
  type: "text";
  default?: string;
  value?: string;
}

interface CliSingleSelectOption extends CliOptionBase {
  type: "singleSelect";
  default?: string | boolean;
  choices?: string[] | boolean[];
  choiceListCommand?: string;
  value?: string | boolean;
}

interface CliMultiSelectOption extends CliOptionBase {
  type: "multiSelect";
  default?: string[] | boolean[];
  choices?: string[] | boolean[];
  choiceListCommand?: string;
  value?: string[] | boolean[];
}

export type CliOption =
  | CliBooleanOption
  | CliTextOption
  | CliSingleSelectOption
  | CliMultiSelectOption;

export type CliArgument = CliTextOption | CliSingleSelectOption;
