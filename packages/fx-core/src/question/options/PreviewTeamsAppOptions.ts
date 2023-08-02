// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const PreviewTeamsAppOptions: CLICommandOption[] = [
  {
    name: "m365-host",
    type: "string",
    shortName: "mh",
    description: "Preview the application in Teams, Outlook or the Microsoft 365 app.",
    required: true,
    default: "teams",
    choices: ["teams", "outlook", "office"],
  },
  {
    name: "teams-manifest-file",
    questionName: "manifest-path",
    type: "string",
    shortName: "tm",
    description:
      "Specifies the Teams app manifest template file path, it's a relative path to project root folder, defaults to './appPackage/manifest.json'",
    required: true,
  },
];
export const PreviewTeamsAppArguments: CLICommandArgument[] = [];
