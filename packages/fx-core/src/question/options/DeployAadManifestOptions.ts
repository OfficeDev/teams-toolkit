// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const DeployAadManifestOptions: CLICommandOption[] = [
  {
    name: "aad-manifest-file",
    questionName: "manifest-file-path",
    type: "string",
    shortName: "am",
    description:
      "Specifies the Azure AD app manifest file path, it's a relative path to project root folder, defaults to './aad.manifest.json'",
  },
  {
    name: "env",
    type: "string",
    description: "Specifies the environment name for the project.",
  },
];
export const DeployAadManifestArguments: CLICommandArgument[] = [];
