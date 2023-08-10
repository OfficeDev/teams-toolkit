// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption } from "@microsoft/teamsfx-api";
import path from "path";
import os from "os";

export const RootFolderOption: CLICommandOption = {
  name: "folder",
  shortName: "f",
  description: "Root folder of the project.",
  type: "string",
  required: true,
  default: path.join(os.homedir(), "TeamsApps"),
};

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
