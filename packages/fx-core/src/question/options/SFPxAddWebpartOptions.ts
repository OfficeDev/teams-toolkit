// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const SFPxAddWebpartOptions: CLICommandOption[] = [
  {
    name: "spfx-folder",
    type: "text",
    shortName: "sf",
    description: "Directory path that contains the existing SarePoint Framework solutions.",
    required: true,
  },
  {
    name: "spfx-webpart-name",
    type: "text",
    shortName: "sw",
    description: "Name for SharePoint Framework Web Part.",
    required: true,
    default: "helloworld",
  },
  {
    name: "manifest-path",
    type: "text",
    description: "Select Teams manifest.json file",
    required: true,
  },
  {
    name: "local-manifest-path",
    type: "text",
    description: "Select local Teams manifest.json file",
    required: true,
  },
];
export const SFPxAddWebpartArguments: CLICommandArgument[] = [];
