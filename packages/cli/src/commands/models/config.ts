// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { CLICommand } from "@microsoft/teamsfx-api";
import { configGetCommand } from "./configGet";
import { configSetCommand } from "./configSet";

export const configCommand: CLICommand = {
  name: "config",
  description: "Manage global configurations.",
  commands: [configGetCommand, configSetCommand],
};
