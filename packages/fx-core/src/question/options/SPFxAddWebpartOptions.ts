// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const SPFxAddWebpartOptions: CLICommandOption[] = [
  {
    name: "spfx-folder",
    type: "text",
    description: "SPFx solution folder",
    required: true,
  },
  {
    name: "spfx-webpart-name",
    type: "text",
    description: "Web Part Name",
    required: true,
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
export const SPFxAddWebpartArguments: CLICommandArgument[] = [];
