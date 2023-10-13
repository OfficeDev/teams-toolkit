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
export const TeamsAppManifestFileOption: CLICommandOption = {
  name: "manifest-file",
  type: "string",
  description: "Specifies the Microsoft Teams app manifest file path.",
};
export const TeamsAppPackageOption: CLICommandOption = {
  name: "package-file",
  type: "string",
  description: "Specifies the zipped Microsoft Teams app package file path.",
};
export const TeamsAppOuputPackageOption: CLICommandOption = {
  name: "output-package-file",
  type: "string",
  description: "Specifies the output zipped Microsoft Teams app package file path.",
  default: "./appPackage/build/appPackage.zip",
};
export const TeamsAppOutputManifestFileOption: CLICommandOption = {
  name: "output-manifest-file",
  type: "string",
  description: "Specifies the output Microsoft Teams app manifest file path.",
  default: "./appPackage/build/manifest.json",
};
export const EnvOption: CLICommandOption = {
  name: "env",
  type: "string",
  description: "Specifies the environment name for the project.",
};

export const EnvFileOption: CLICommandOption = {
  name: "env-file",
  type: "string",
  description:
    "Specifies the .env file that defines the variables to replace in the Teams app manifest template file.",
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
