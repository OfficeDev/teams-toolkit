// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption } from "@microsoft/teamsfx-api";
import path from "path";
import os from "os";

export const RootFolderOption: CLICommandOption = {
  name: "folder",
  shortName: "f",
  description: "Root folder of the project.",
  type: "text",
  required: true,
  default: path.join(os.homedir(), "TeamsApps"),
};

export const ProjectFolderOption: CLICommandOption = {
  name: "folder",
  questionName: "projectPath",
  shortName: "f",
  description: "Project folder.",
  type: "text",
  required: true,
  default: "./",
};

export const EnvOption: CLICommandOption = {
  name: "env",
  type: "text",
  description: "Specifies the environment name for the project.",
  required: true,
};

export const TeamsManifestPathOption: CLICommandOption = {
  type: "text",
  name: "manifest-file-path",
  shortName: "m",
  description:
    "Specifies the Teams app manifest template file path, it's a relative path to project root folder, defaults to './appPackage/manifest.json'",
};

export const AadManifestPathOption: CLICommandOption = {
  type: "text",
  name: "manifest-file-path",
  shortName: "m",
  description:
    "Specifies the AAD app manifest template file path, it's a relative path to project root folder, defaults to './aad.manifest.json'",
};
