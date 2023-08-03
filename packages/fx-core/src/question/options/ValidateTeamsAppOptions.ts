// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const ValidateTeamsAppOptions: CLICommandOption[] = [
  {
    name: "teams-manifest-file",
    questionName: "manifest-path",
    type: "string",
    shortName: "tm",
    description:
      "Specifies the Teams app manifest template file path, it's a relative path to project root folder, defaults to './appPackage/manifest.json'",
  },
  {
    name: "app-package-file",
    questionName: "app-package-file-path",
    type: "string",
    shortName: "pf",
    description:
      "Specifies the zipped Teams app package path, it's a relative path to project root folder, defaults to '${folder}/appPackage/build/appPackage.${env}.zip'",
  },
];
export const ValidateTeamsAppArguments: CLICommandArgument[] = [];
