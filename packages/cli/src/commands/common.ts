// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption } from "@microsoft/teamsfx-api";

export const ProjectFolderOption: CLICommandOption = {
  name: "folder",
  questionName: "projectPath",
  shortName: "f",
  description: "Project folder.",
  type: "string",
  required: true,
  default: "./",
};

export const EnvOption: CLICommandOption = {
  name: "env",
  type: "string",
  description: "Specifies the environment name for the project.",
};

export const ListFormatOption: CLICommandOption = {
  name: "format",
  shortName: "f",
  description: "Specifies the format of the results.",
  type: "string",
  choices: ["table", "json"],
  default: "table",
  required: true,
};

export const ShowDescriptionOption: CLICommandOption = {
  name: "description",
  shortName: "d",
  description: "Whether to show description in the result.",
  type: "boolean",
  default: false,
  required: true,
};
