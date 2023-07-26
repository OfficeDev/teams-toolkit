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
  handler: (args: { [argName: string]: string | string[] }) => Promise<Result<undefined, FxError>>;
}

interface CliOptionBase {
  name: string;
  description: string;
  shortName?: string;
  type: "text" | "boolean" | "singleSelect" | "multiSelect";
  required?: boolean;
}

interface CliBooleanOption extends CliOptionBase {
  type: "boolean";
  default?: boolean;
}

interface CliTextOption extends CliOptionBase {
  type: "text";
  default?: string;
}

interface CliSingleSelectOption extends CliOptionBase {
  type: "singleSelect";
  default?: string;
  choices?: string[];
  choiceListCommand?: string;
}

interface CliMultiSelectOption extends CliOptionBase {
  type: "multiSelect";
  default?: string[];
  choices?: string[];
  choiceListCommand?: string;
}

export type CliOption =
  | CliBooleanOption
  | CliTextOption
  | CliSingleSelectOption
  | CliMultiSelectOption;

export type CliArgument = CliTextOption | CliSingleSelectOption;
