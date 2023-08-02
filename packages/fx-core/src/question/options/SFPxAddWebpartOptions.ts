// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const SFPxAddWebpartOptions: CLICommandOption[] = [
  {
    name: "spfx-folder",
    type: "string",
    shortName: "sf",
    description: "Directory path that contains the existing SarePoint Framework solutions.",
    required: true,
  },
  {
    name: "spfx-webpart-name",
    type: "string",
    shortName: "sw",
    description: "Name for SharePoint Framework Web Part.",
    required: true,
    default: "helloworld",
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
  {
    name: "local-manifest-path",
    type: "string",
    description: "Select local Teams manifest.json file",
    required: true,
  },
];
export const SFPxAddWebpartArguments: CLICommandArgument[] = [];
