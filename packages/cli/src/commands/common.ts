// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption } from "@microsoft/teamsfx-api";
import { commands } from "../resource";

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
  default: "./appPackage/manifest.json",
};
export const EntraAppManifestFileOption: CLICommandOption = {
  name: "manifest-file",
  questionName: "manifest-file-path",
  type: "string",
  description: "Specifies the Microsoft Entra app manifest file path.",
  default: "./aad.manifest.json",
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
  default: "./appPackage/build/appPackage.${env}.zip",
};
export const TeamsAppOutputManifestFileOption: CLICommandOption = {
  name: "output-manifest-file",
  type: "string",
  description: "Specifies the output Microsoft Teams app manifest file path.",
  default: "./appPackage/build/manifest.${env}.json",
};
export const EnvOption: CLICommandOption = {
  name: "env",
  type: "string",
  description:
    "Specifies the environment name for the project scaffolded by Microsoft Teams Toolkit.",
};
export const IgnoreLoadEnvOption: CLICommandOption = {
  name: "ignore-env-file",
  type: "boolean",
  description: "Whether to skip loading .env file when --env is not specified.",
};
export const EnvFileOption: CLICommandOption = {
  name: "env-file",
  type: "string",
  description:
    "Specifies the .env file that defines the variables to replace in the Teams app manifest template file.",
};
export const IgnoreKeysOption: CLICommandOption = {
  name: "ignore-keys",
  type: "array",
  description: "Specifies the keys to ignore in the .env file.",
};

export const ListFormatOption: CLICommandOption = {
  name: "format",
  shortName: "f",
  description: commands["list.templates"].options.format,
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

export const ConfigFilePathOption: CLICommandOption = {
  type: "string",
  name: "config-file-path",
  shortName: "c",
  description: "Specifies the path of the configuration yaml file.",
};
