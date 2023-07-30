// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommandOption } from "./types";

export const FolderOption: CLICommandOption = {
  name: "folder",
  shortName: "f",
  description: "Root folder of the project.",
  type: "text",
  required: true,
  default: "./",
};

export const EnvOption: CLICommandOption = {
  name: "env",
  type: "text",
  shortName: "e",
  description: "Specifies the environment name for the project.",
};
