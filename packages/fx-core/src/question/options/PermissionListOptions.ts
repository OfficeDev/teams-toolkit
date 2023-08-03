// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const PermissionListOptions: CLICommandOption[] = [
  {
    name: "teams-manifest-file",
    questionName: "manifest-path",
    type: "string",
    shortName: "tm",
    description:
      "Specifies the Teams app manifest template file path, it's a relative path to project root folder, defaults to './appPackage/manifest.json'",
  },
  {
    name: "env",
    type: "string",
    description: "Specifies the environment name for the project.",
  },
  {
    name: "aad-manifest-file",
    questionName: "manifest-file-path",
    type: "string",
    shortName: "am",
    description:
      "Specifies the Azure AD app manifest file path, it's a relative path to project root folder, defaults to './aad.manifest.json'",
  },
];
export const PermissionListArguments: CLICommandArgument[] = [];
